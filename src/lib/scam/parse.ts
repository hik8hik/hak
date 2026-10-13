import { BRANDS, STRIP_TOKENS } from "./brands";
import type { EvidenceRow, ScamFinding } from "./types";

export interface ParsedUrl {
  input: string;
  normalized: string;
  protocol: string;
  hostname: string;
  port: string;
  path: string;
  query: string;
  fragment: string;
  registrableDomain: string;
  subdomain: string;
  tld: string;
  isIpHost: boolean;
  isPunycode: boolean;
  hasCredentials: boolean;
  url: URL | null;
  error: string | null;
}

/** Best-effort registrable domain. Not a full public-suffix list. */
export function registrableDomainOf(hostname: string): string {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return h;
  if (h.includes(":")) return h;   // IPv6, leave as-is
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  // Handle a couple of two-level public suffixes.
  const twoLevel = ["co.uk","co.jp","com.au","com.br","co.nz","co.za","com.mx","com.ar"];
  const tail2 = parts.slice(-2).join(".");
  if (twoLevel.includes(tail2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

export function parseUrl(input: string): ParsedUrl {
  const raw = (input || "").trim();
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : "https://" + raw;
  let u: URL | null = null;
  let error: string | null = null;
  try { u = new URL(withProto); } catch (e) { error = String(e); }
  if (!u) {
    return {
      input: raw, normalized: raw, protocol: "", hostname: "", port: "",
      path: "", query: "", fragment: "", registrableDomain: "",
      subdomain: "", tld: "", isIpHost: false, isPunycode: false,
      hasCredentials: false, url: null, error,
    };
  }
  const hostname = u.hostname.toLowerCase();
  const isIpHost = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  const isPunycode = hostname.startsWith("xn--") || hostname.includes(".xn--");
  const reg = registrableDomainOf(hostname);
  const subdomain = hostname === reg ? "" : hostname.slice(0, hostname.length - reg.length - 1);
  const labels = reg.split(".");
  const tld = labels.length >= 2 ? labels[labels.length - 1] : "";
  const hasCredentials = !!u.username || !!u.password;
  return {
    input: raw,
    normalized: u.toString(),
    protocol: u.protocol.replace(":", ""),
    hostname,
    port: u.port || (u.protocol === "https:" ? "443" : u.protocol === "http:" ? "80" : ""),
    path: u.pathname,
    query: u.search,
    fragment: u.hash,
    registrableDomain: reg,
    subdomain,
    tld,
    isIpHost,
    isPunycode,
    hasCredentials,
    url: u,
    error: null,
  };
}

function shannon(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const k in freq) {
    const p = freq[k] / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Array(n + 1);
  const cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

/** Strip common noise tokens from a domain label before comparison. */
function stripTokens(s: string): string {
  let out = s;
  for (const t of STRIP_TOKENS) out = out.replace(new RegExp(t, "g"), "");
  return out.replace(/[-_]/g, "");
}

interface Typosquat {
  brand: string;
  distance: number;
  label: string;
}

function findTyposquat(reg: string): Typosquat | null {
  const label = reg.split(".")[0] || "";
  const stripped = stripTokens(label);
  if (!stripped) return null;
  let best: Typosquat | null = null;
  for (const brand of BRANDS) {
    if (stripped === brand) return { brand, distance: 0, label };
    const d = levenshtein(stripped, brand);
    if (!best || d < best.distance) best = { brand, distance: d, label };
  }
  // Only report close matches. Different thresholds for short vs long brands.
  if (!best) return null;
  const len = best.brand.length;
  const threshold = len <= 5 ? 1 : len <= 8 ? 2 : 3;
  if (best.distance === 0 || best.distance > threshold) return null;
  return best;
}

const SUSPICIOUS_TLDS = new Set([
  "tk","ml","ga","cf","gq","top","xyz","click","link","work",
  "loan","download","stream","review","country","kim","science",
  "party","gdn","men","date","racing","win","bid","trade",
]);

const SENSITIVE_PATHS = [
  "/login","/signin","/sign-in","/verify","/confirm","/account",
  "/secure","/update","/billing","/payment","/wallet","/recover",
  "/auth","/session","/unlock","/recovery","/verification",
];

export interface LexicalResult {
  finding: ScamFinding;
  flags: string[];
  typosquat: Typosquat | null;
}

export function analyzeLexical(p: ParsedUrl): LexicalResult {
  const flags: string[] = [];
  const evidence: EvidenceRow[] = [];
  if (p.error || !p.url) {
    return {
      finding: {
        id: "lexical", kind: "lexical",
        title: "URL parsing",
        summary: "Could not parse the URL: " + (p.error || "unknown error"),
        severity: "info",
        evidence: [{ label: "Input", value: p.input }],
      },
      flags, typosquat: null,
    };
  }

  evidence.push({ label: "Hostname", value: p.hostname });
  evidence.push({ label: "Registrable domain", value: p.registrableDomain });
  if (p.subdomain) evidence.push({ label: "Subdomain", value: p.subdomain });
  evidence.push({ label: "TLD", value: "." + p.tld });
  evidence.push({ label: "Path", value: p.path || "/" });
  if (p.query) evidence.push({ label: "Query", value: p.query });

  // Protocol downgrade
  if (p.protocol !== "https") {
    flags.push("not-https")
    evidence.push({ label: "Protocol", value: p.protocol + " (unencrypted)", bad: true })
  } else {
    evidence.push({ label: "Protocol", value: "https" })
  }

  // IP as host
  if (p.isIpHost) {
    flags.push("ip-host")
    evidence.push({ label: "Host is a raw IP", value: p.hostname, bad: true })
  }

  // Punycode / IDN homoglyph
  if (p.isPunycode) {
    flags.push("punycode")
    evidence.push({ label: "Punycode / IDN", value: "yes — possible homoglyph spoof", bad: true })
  }

  // Credentials in URL
  if (p.hasCredentials) {
    flags.push("credentials-in-url")
    evidence.push({ label: "Credentials in URL", value: "present", bad: true })
  }

  // Subdomain depth
  const depth = p.subdomain ? p.subdomain.split(".").length : 0
  if (depth >= 3) {
    flags.push("deep-subdomain")
    evidence.push({ label: "Subdomain depth", value: String(depth) + " levels", bad: true })
  } else if (depth > 0) {
    evidence.push({ label: "Subdomain depth", value: String(depth) + " level(s)" })
  }

  // Suspicious TLD
  if (SUSPICIOUS_TLDS.has(p.tld)) {
    flags.push("suspicious-tld")
    evidence.push({ label: "TLD reputation", value: "." + p.tld + " is heavily abused in phishing", bad: true })
  }

  // Sensitive path keywords
  const pathLower = (p.path + p.query).toLowerCase()
  const hitPaths = SENSITIVE_PATHS.filter((k) => pathLower.includes(k))
  if (hitPaths.length) {
    flags.push("sensitive-path")
    evidence.push({ label: "Sensitive path keywords", value: hitPaths.join(", "), bad: true })
  }

  // Excessive percent-encoding (double-encode, dot-dot tricks)
  const encCount = (p.normalized.match(/%[0-9a-f]{2}/gi) || []).length
  if (encCount >= 6) {
    flags.push("heavy-encoding")
    evidence.push({ label: "Percent-encoding count", value: String(encCount) + " escapes", bad: true })
  } else if (encCount > 0) {
    evidence.push({ label: "Percent-encoding count", value: String(encCount) })
  }

  // Hostname entropy
  const entropy = shannon(p.registrableDomain.split(".")[0] || "")
  evidence.push({ label: "Hostname entropy", value: entropy.toFixed(2) + " bits/char" })
  if (entropy > 3.9 && (p.registrableDomain.split(".")[0] || "").length > 12) {
    flags.push("high-entropy")
    evidence.push({ label: "Entropy interpretation", value: "high — possible DGA or random-generated", bad: true })
  }

  // Typosquat
  const typo = findTyposquat(p.registrableDomain)
  if (typo && typo.distance > 0) {
    flags.push("typosquat")
    evidence.push({
      label: "Typosquat candidate",
      value: "“" + typo.label + "” is Levenshtein distance " + typo.distance + " from brand “" + typo.brand + "”",
      bad: true,
    })
  } else if (typo && typo.distance === 0) {
    // exact brand match as a registrable domain. Only suspicious if it is
    // not actually the brand’s real TLD — which we cannot verify here, so
    // flag it as informational for the analyst.
    evidence.push({ label: "Typosquat candidate", value: "“" + typo.label + "” matches brand exactly" })
  }

  let severity: ScamFinding["severity"] = "info"
  const critical = ["typosquat", "punycode", "ip-host"]
  const high = ["suspicious-tld", "not-https", "credentials-in-url"]
  const medium = ["sensitive-path", "deep-subdomain", "high-entropy"]
  if (flags.some((f) => critical.includes(f))) severity = "critical"
  else if (flags.some((f) => high.includes(f))) severity = "high"
  else if (flags.some((f) => medium.includes(f))) severity = "medium"
  else if (flags.length) severity = "low"

  const summary = flags.length
    ? flags.length + " lexical indicator(s) detected."
    : "No lexical indicators detected. URL structure looks unremarkable."

  return {
    finding: {
      id: "lexical", kind: "lexical",
      title: "URL lexical analysis",
      summary,
      severity,
      evidence,
    },
    flags,
    typosquat: typo,
  };
}