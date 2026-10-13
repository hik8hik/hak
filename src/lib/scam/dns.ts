import type { ScamFinding, EvidenceRow } from "./types";
import type { Platform } from "./platforms";

const DOH = "https://cloudflare-dns.com/dns-query";

interface DohAnswer { name: string; type: number; TTL: number; data: string; }
interface DohResponse { Status: number; Answer?: DohAnswer[]; }

async function queryDoh(name: string, type: string): Promise<DohAnswer[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const r = await fetch(DOH + "?name=" + encodeURIComponent(name) + "&type=" + type, {
      headers: { Accept: "application/dns-json" }, cache: "no-store", signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = (await r.json()) as DohResponse;
    return j.Answer || [];
  } catch { return []; }
}

export interface DnsResult {
  finding: ScamFinding;
  a: string[]; aaaa: string[]; ns: string[]; mx: string[];
  txt: string[]; caa: string[]; spf: string | null; dmarc: string | null;
  platformManaged: boolean;
}

export async function runDns(
  hostname: string,
  registrable: string,
  platform: Platform | null,
): Promise<DnsResult> {
  // IP host: nothing to query.
  if (!hostname || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return {
      finding: {
        id: "dns", kind: "dns", title: "DNS records",
        summary: "Hostname is an IP address; DNS lookup skipped.",
        severity: "info", confidence: "high",
        evidence: [{ id: "dns.ip", label: "Note", value: "No DNS layer to evaluate." }],
      },
      a: [], aaaa: [], ns: [], mx: [], txt: [], caa: [], spf: null, dmarc: null,
      platformManaged: false,
    };
  }

  const [a, aaaa, ns, mx, txt, caa, dmarcTxt] = await Promise.all([
    queryDoh(hostname, "A"),
    queryDoh(hostname, "AAAA"),
    queryDoh(registrable, "NS"),
    queryDoh(registrable, "MX"),
    queryDoh(registrable, "TXT"),
    queryDoh(registrable, "CAA"),
    queryDoh("_dmarc." + registrable, "TXT"),
  ]);

  const aList = a.filter((r) => r.type === 1).map((r) => r.data);
  const aaaaList = aaaa.filter((r) => r.type === 28).map((r) => r.data);
  const nsList = ns.filter((r) => r.type === 2).map((r) => r.data.replace(/\.$/, ""));
  const mxList = mx.filter((r) => r.type === 15).map((r) => r.data);
  const txtList = txt.filter((r) => r.type === 16).map((r) => r.data.replace(/^"|"$/g, ""));
  const caaList = caa.filter((r) => r.type === 257).map((r) => r.data);
  const spf = txtList.find((t) => t.toLowerCase().startsWith("v=spf1")) || null;
  const dmarc = dmarcTxt.filter((r) => r.type === 16).map((r) => r.data.replace(/^"|"$/g, ""))
    .find((t) => t.toLowerCase().startsWith("v=dmarc1")) || null;

  // ── Platform-managed case ───────────────────────────────────────────
  if (platform && platform.managesDns) {
    const evidence: EvidenceRow[] = [
      { id: "dns.platform", label: "DNS managed by", value: platform.name + " \u2014 MX/SPF/DMARC are the platform's, not the operator's." },
    ];
    if (aList.length) evidence.push({ id: "dns.a", label: "A records", value: aList.slice(0, 3).join(", ") });
    if (nsList.length) evidence.push({ id: "dns.ns", label: "Nameservers", value: nsList.join(", ") });
    return {
      finding: {
        id: "dns", kind: "dns", title: "DNS records",
        summary: "DNS is managed by " + platform.name + ". Operator-level DNS signals are not applicable.",
        severity: "info", confidence: "high",
        evidence,
      },
      a: aList, aaaa: aaaaList, ns: nsList, mx: mxList, txt: txtList, caa: caaList,
      spf, dmarc, platformManaged: true,
    };
  }

  // ── Normal (self-managed) case ─────────────────────────────────────
  const evidence: EvidenceRow[] = [];
  const flags: string[] = [];

  if (aList.length) evidence.push({ id: "dns.a", label: "A records", value: aList.join(", ") });
  else { flags.push("no-a"); evidence.push({ id: "dns.a", label: "A records", value: "none", bad: true }); }
  if (aaaaList.length) evidence.push({ id: "dns.aaaa", label: "AAAA records", value: aaaaList.join(", ") });
  if (nsList.length) evidence.push({ id: "dns.ns", label: "Nameservers", value: nsList.join(", ") });

  if (mxList.length) evidence.push({ id: "dns.mx", label: "MX records", value: mxList.slice(0, 3).join(", ") });
  else { flags.push("no-mx"); evidence.push({ id: "dns.mx", label: "MX records", value: "none \u2014 domain cannot receive email", bad: true }); }

  if (spf) evidence.push({ id: "dns.spf", label: "SPF", value: spf });
  else { flags.push("no-spf"); evidence.push({ id: "dns.spf", label: "SPF", value: "not configured", bad: true }); }

  if (dmarc) evidence.push({ id: "dns.dmarc", label: "DMARC", value: dmarc });
  else { flags.push("no-dmarc"); evidence.push({ id: "dns.dmarc", label: "DMARC", value: "not configured", bad: true }); }

  if (caaList.length) evidence.push({ id: "dns.caa", label: "CAA", value: caaList.join(" | ") });
  else { flags.push("no-caa"); evidence.push({ id: "dns.caa", label: "CAA", value: "not configured \u2014 any CA may issue", bad: true }); }

  // Severity: absence of DNS records on a self-managed domain.
  // Weighted by how many are missing and whether or not the domain
  // otherwise looks established. Multiple gaps is meaningful; one gap
  // on an otherwise healthy domain is not.
  let severity: ScamFinding["severity"] = "info";
  let confidence: ScamFinding["confidence"] = "medium";
  if (flags.includes("no-a")) { severity = "high"; confidence = "high"; }
  else if (flags.length >= 4) { severity = "medium"; confidence = "high"; }
  else if (flags.length >= 2) { severity = "low"; confidence = "medium"; }
  else if (flags.length === 1) { severity = "info"; confidence = "low"; }

  const summary = flags.length >= 3
    ? flags.length + " DNS / email-authentication records are missing."
    : flags.length
      ? "Some DNS or email-authentication records are not configured."
      : "DNS records are complete: A, MX, SPF, DMARC and CAA all present.";

  return {
    finding: {
      id: "dns", kind: "dns", title: "DNS & email authentication",
      summary, severity, confidence, evidence,
    },
    a: aList, aaaa: aaaaList, ns: nsList, mx: mxList, txt: txtList, caa: caaList,
    spf, dmarc, platformManaged: false,
  };
}
