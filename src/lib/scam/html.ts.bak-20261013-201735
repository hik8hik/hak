import type { ScamFinding, EvidenceRow } from "./types";
import type { Platform } from "./platforms";
import { isPlatformBrand, isPlatformHost } from "./platforms";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36";
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;

const INSTALL_APP_PATTERNS = [
  /install\s+(?:our\s+)?app/i,
  /download\s+apk/i,
  /get\s+it\s+on\s+android/i,
  /apk\s+download/i,
  /android\s+app\s+link/i,
];

const CERT_BADGE_PATTERNS = [
  /soc[\s_-]?2/i, /iso[\s_-]?27001/i, /pci[\s_-]?dss/i,
  /hipaa/i, /gdpr[\s_-]?compliant/i, /ssl[\s_-]?secured/i, /bank[\s_-]?grade/i,
];

// Brands whose mention is almost always contextual/technical, never
// impersonation. Filtered globally before scoring.
const BENIGN_BRAND_CONTEXT = [
  "react", "vue", "svelte", "angular", "next.js", "nextjs",
  "tailwind", "bootstrap", "node", "express", "django", "flask",
  "typescript", "javascript", "python", "golang", "rust",
];

const CREDENTIAL_KEYWORDS = ["login", "signin", "sign in", "verify", "account", "password", "credential", "authenticate"];

export interface HtmlAnalysis {
  ok: boolean;
  status: number;
  contentType: string;
  sizeBytes: number;
  finalUrl: string;
  title: string;
  metaDescription: string;
  faviconUrl: string | null;
  scriptSrcs: string[];
  stylesheetSrcs: string[];
  imageSrcs: string[];
  externalOrigins: { origin: string; isThirdParty: boolean; isPlatformCdn: boolean }[];
  formActions: { action: string; method: string; external: boolean }[];
  emails: string[];
  socialHandles: string[];
  /** Each mention carries an impersonation score. */
  brandMentions: { brand: string; score: number; where: string }[];
  kenyanBrandTokens: string[];
  installAppHits: string[];
  certBadges: string[];
  hasVisibleLoginForm: boolean;
}

interface FetchResult {
  ok: boolean; status: number; contentType: string; body: string;
  sizeBytes: number; finalUrl: string; error?: string;
}

async function fetchHtml(url: string): Promise<FetchResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "GET", redirect: "follow", signal: ctrl.signal, cache: "no-store",
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
    });
    const text = await r.text();
    return {
      ok: r.ok, status: r.status, contentType: r.headers.get("content-type") || "",
      body: text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text,
      sizeBytes: text.length, finalUrl: r.url || url,
    };
  } catch (e) {
    return { ok: false, status: 0, contentType: "", body: "", sizeBytes: 0, finalUrl: url, error: String(e) };
  } finally { clearTimeout(t); }
}

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)));
}

function abs(url: string, base: string): string | null {
  try { return new URL(url, base).toString(); } catch { return null; }
}

function originOf(url: string): string | null {
  try { return new URL(url).origin; } catch { return null; }
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

function extractMeta(html: string): { title: string; description: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
  return { title: decode(title), description: decode(desc) };
}

function extractSrcs(html: string, base: string, tag: string): string[] {
  const re = new RegExp("<" + tag + "[^>]+src=[\"']([^\"']+)[\"']", "gi");
  const out: string[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) { const u = abs(m[1], base); if (u) out.push(u); }
  return out;
}

function extractHrefs(html: string, base: string, relRe: RegExp): string[] {
  const out: string[] = []; const re = /<link[^>]+>/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!relRe.test(m[0])) continue;
    const h = m[0].match(/href=["']([^"']+)["']/i)?.[1]; if (!h) continue;
    const u = abs(h, base); if (u) out.push(u);
  }
  return out;
}

function extractForms(html: string, base: string, regDomain: string) {
  const out: { action: string; method: string; external: boolean }[] = [];
  const re = /<form[^>]*>/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const action = m[0].match(/action=["']([^"']*)["']/i)?.[1] || "";
    const method = (m[0].match(/method=["']([^"']+)["']/i)?.[1] || "get").toLowerCase();
    const url = action ? abs(action, base) : base;
    if (!url) continue;
    let external = false;
    try {
      const h = new URL(url).hostname;
      external = h.split(".").slice(-2).join(".") !== regDomain;
    } catch {}
    out.push({ action: url, method, external });
  }
  return out;
}

function extractEmails(html: string): string[] {
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const set = new Set<string>(); let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) set.add(m[0].toLowerCase());
  return Array.from(set);
}

function extractSocialHandles(html: string): string[] {
  const set = new Set<string>();
  const re = /@([A-Za-z][A-Za-z0-9_]{2,30})/g; let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) set.add("@" + m[1]);
  return Array.from(set);
}

/**
 * Impersonation scoring.
 *
 * A brand mention counts as impersonation only if the page appears to be
 * claiming to BE that brand. Footer attribution ("Powered by Vercel") does
 * not score. Brand in the title with a login form does.
 */
function scoreBrandMentions(
  html: string,
  bodyText: string,
  brands: string[],
  platform: Platform | null,
  sameOriginText: string,
): { brand: string; score: number; where: string }[] {
  const lowerBody = bodyText.toLowerCase();
  const lowerHtml = html.toLowerCase();
  const titleMatch = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").toLowerCase();
  const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) => m[1].toLowerCase()).join(" ");
  const hasLoginInput = /<input[^>]+type=["']password["']/i.test(html);
  const out: { brand: string; score: number; where: string }[] = [];
  for (const brand of brands) {
    const b = brand.toLowerCase();
    if (BENIGN_BRAND_CONTEXT.includes(b)) continue;
    if (isPlatformBrand(platform, b)) continue;
    if (!lowerBody.includes(b)) continue;
    let score = 0;
    const where: string[] = [];
    if (titleMatch.includes(b)) { score += 3; where.push("title"); }
    if (h1Matches.includes(b)) { score += 3; where.push("h1"); }
    // Brand within ~120 chars of a credential keyword
    const idx = lowerBody.indexOf(b);
    if (idx >= 0) {
      const window = lowerBody.slice(Math.max(0, idx - 120), idx + 120);
      if (CREDENTIAL_KEYWORDS.some((k) => window.includes(k))) { score += 2; where.push("near credential UI"); }
    }
    if (hasLoginInput && (titleMatch.includes(b) || h1Matches.includes(b))) { score += 2; where.push("login form"); }
    // Negative signals
    if (lowerHtml.includes("//" + b + ".com") || lowerHtml.includes(b + ".com/") && sameOriginText.includes(b + ".com")) {
      score -= 4; where.push("links to real brand domain");
    }
    if (score < 2) continue;
    out.push({ brand, score, where: where.join(", ") });
  }
  return out;
}

export async function analyzeHtml(
  url: string,
  registrableDomain: string,
  brands: string[],
  platform: Platform | null,
): Promise<{ finding: ScamFinding; analysis: HtmlAnalysis }> {
  const fetched = await fetchHtml(url);
  const empty: HtmlAnalysis = {
    ok: false, status: fetched.status, contentType: fetched.contentType,
    sizeBytes: fetched.sizeBytes, finalUrl: fetched.finalUrl,
    title: "", metaDescription: "", faviconUrl: null,
    scriptSrcs: [], stylesheetSrcs: [], imageSrcs: [],
    externalOrigins: [], formActions: [], emails: [], socialHandles: [],
    brandMentions: [], kenyanBrandTokens: [], installAppHits: [],
    certBadges: [], hasVisibleLoginForm: false,
  };
  if (!fetched.ok || !fetched.body) {
    return {
      analysis: empty,
      finding: {
        id: "html", kind: "html", title: "Page content analysis",
        summary: fetched.error ? "Could not fetch the page: " + fetched.error
                               : "Page did not respond 2xx (HTTP " + fetched.status + ").",
        severity: "info", confidence: "low",
        evidence: [{ id: "html.fetched", label: "URL", value: url }],
      },
    };
  }
  const html = fetched.body;
  const base = fetched.finalUrl;
  const meta = extractMeta(html);
  const scripts = extractSrcs(html, base, "script");
  const styles = extractHrefs(html, base, /rel=["'][^"']*stylesheet/i);
  const images = extractSrcs(html, base, "img");

  // External origins with platform awareness
  const origins = new Map<string, { isThirdParty: boolean; isPlatformCdn: boolean }>();
  for (const u of [...scripts, ...styles, ...images]) {
    const o = originOf(u); const h = hostOf(u); if (!o || !h) continue;
    const isPlatformCdn = isPlatformHost(platform, h);
    let third = true;
    try { third = h.split(".").slice(-2).join(".") !== registrableDomain; } catch {}
    origins.set(o, { isThirdParty: third, isPlatformCdn });
  }
  const externalOrigins = Array.from(origins.entries()).map(([origin, meta2]) => ({ origin, ...meta2 }));
  const realThirdParties = externalOrigins.filter((o) => o.isThirdParty && !o.isPlatformCdn);

  const forms = extractForms(html, base, registrableDomain);
  const emails = extractEmails(html);
  const handles = extractSocialHandles(html);

  const bodyText = decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  const brandMentions = scoreBrandMentions(html, bodyText, brands, platform, html);
  const kenyanHits: string[] = [];
  const bodyLower = bodyText.toLowerCase();
  for (const t of ["safaricom", "mpesa", "m-pesa", "ziidi", "nairobi securities exchange"]) {
    if (bodyLower.includes(t)) kenyanHits.push(t);
  }
  const installAppHits = INSTALL_APP_PATTERNS.flatMap((re) => { const m = html.match(re); return m ? [m[0]] : []; });
  const certBadges = CERT_BADGE_PATTERNS.flatMap((re) => { const m = html.match(re); return m ? [m[0]] : []; });
  const hasVisibleLoginForm = forms.length > 0 || /<input[^>]+type=["']password["']/i.test(html);

  const analysis: HtmlAnalysis = {
    ok: true, status: fetched.status, contentType: fetched.contentType,
    sizeBytes: fetched.sizeBytes, finalUrl: base,
    title: meta.title, metaDescription: meta.description, faviconUrl: null,
    scriptSrcs: scripts, stylesheetSrcs: styles, imageSrcs: images,
    externalOrigins, formActions: forms, emails, socialHandles: handles,
    brandMentions, kenyanBrandTokens: kenyanHits, installAppHits, certBadges, hasVisibleLoginForm,
  };

  // ── Finding ──
  const evidence: EvidenceRow[] = [];
  const flags: { kind: string; severity: "high" | "medium" | "low" }[] = [];

  if (meta.title) evidence.push({ id: "html.title", label: "Title", value: meta.title.slice(0, 180) });
  if (fetched.finalUrl !== url) {
    evidence.push({ id: "html.redirect", label: "Redirected to", value: fetched.finalUrl, bad: true });
    flags.push({ kind: "redirect", severity: "medium" });
  }
  const externalForms = forms.filter((f) => f.external);
  if (externalForms.length) {
    evidence.push({ id: "html.forms.ext", label: "Forms POST to external domain", value: externalForms.map((f) => f.action).slice(0, 3).join(", "), bad: true });
    flags.push({ kind: "external-form", severity: "high" });
  }
  const externalEmails = emails.filter((e) => {
    const reg = e.split("@")[1]?.split(".").slice(-2).join(".");
    return reg && reg !== registrableDomain;
  });
  if (externalEmails.length) {
    evidence.push({ id: "html.email.ext", label: "Contact email on other domain", value: externalEmails.slice(0, 4).join(", "), bad: true });
    flags.push({ kind: "external-email", severity: "medium" });
  }
  const impersonated = brandMentions.filter((m) => m.score >= 2);
  if (impersonated.length) {
    evidence.push({
      id: "html.impersonation",
      label: "Likely impersonation",
      value: impersonated.map((m) => m.brand + " (" + m.where + ")").join("; "),
      bad: true,
    });
    flags.push({ kind: "impersonation", severity: "high" });
  }
  if (kenyanHits.length) {
    evidence.push({ id: "html.ke.tokens", label: "Kenyan financial brand tokens", value: kenyanHits.join(", ") });
  }
  if (installAppHits.length) {
    evidence.push({ id: "html.install", label: "Install-app prompts", value: installAppHits.join(" | "), bad: true });
    flags.push({ kind: "install-app", severity: "high" });
  }
  if (certBadges.length) {
    evidence.push({ id: "html.badges", label: "Certification badges claimed", value: certBadges.join(" | ") });
    // Only concerning when paired with other high signals — no flag by itself.
  }
  if (realThirdParties.length > 6) {
    evidence.push({ id: "html.3p", label: "Third-party origins", value: realThirdParties.length + " external origins", bad: true });
    flags.push({ kind: "many-third-parties", severity: "low" });
  } else if (realThirdParties.length) {
    evidence.push({ id: "html.3p", label: "Third-party origins", value: realThirdParties.map((o) => o.origin).slice(0, 5).join(", ") });
  }

  let severity: ScamFinding["severity"] = "info";
  let confidence: ScamFinding["confidence"] = "medium";
  if (flags.some((f) => f.severity === "high")) { severity = "high"; confidence = "high"; }
  else if (flags.some((f) => f.severity === "medium")) { severity = "medium"; confidence = "high"; }
  else if (flags.some((f) => f.severity === "low")) { severity = "low"; confidence = "medium"; }

  const summary = flags.length
    ? flags.length + " content-level indicator(s) detected."
    : "Page content looks structurally ordinary.";

  return {
    analysis,
    finding: {
      id: "html", kind: "html", title: "Page content analysis",
      summary, severity, confidence, evidence,
      references: [fetched.finalUrl],
    },
  };
}
