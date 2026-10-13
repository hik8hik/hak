import type { ScamFinding, EvidenceRow } from "./types";
import type { Platform } from "./platforms";

const TIMEOUT_MS = 6000;

const BULLETPROOF_ASNS: Record<string, string> = {
  "AS202422": "goproxy / frequently-abused",
  "AS200373": "Stark Industries Solutions (bulletproof)",
  "AS44477": "Stark Industries Solutions (bulletproof)",
  "AS213248": "Kurz / abuse-friendly",
  "AS401120": "IP Volume / abuse-friendly",
  "AS46997": "Stark Industries Solutions (bulletproof)",
};

export interface HostingInfo {
  ip: string; asn: string; org: string; isp: string;
  country: string; countryCode: string; city: string;
  isCloudflare: boolean; isDatacenter: boolean;
  asnExpectedForPlatform: boolean;
}

interface IpWhoIs {
  success?: boolean; ip?: string;
  city?: string; country?: string; country_code?: string;
  connection?: { asn?: number; org?: string; isp?: string };
  security?: { is_cloudflare?: boolean; is_datacenter?: boolean; is_proxy?: boolean };
}

async function lookup(ip: string): Promise<IpWhoIs | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch("https://ipwho.is/" + encodeURIComponent(ip), { signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as IpWhoIs;
  } catch { return null; }
  finally { clearTimeout(t); }
}

export async function analyzeHosting(
  aRecords: string[],
  platform: Platform | null,
): Promise<{ finding: ScamFinding; info: HostingInfo | null }> {
  if (!aRecords.length) {
    return {
      info: null,
      finding: {
        id: "hosting", kind: "hosting", title: "Hosting infrastructure",
        summary: "No A record available \u2014 hosting lookup skipped.",
        severity: "info", confidence: "low",
      },
    };
  }
  const ip = aRecords[0];
  const d = await lookup(ip);
  if (!d || !d.success) {
    return {
      info: null,
      finding: {
        id: "hosting", kind: "hosting", title: "Hosting infrastructure",
        summary: "IP lookup failed or returned no data.",
        severity: "info", confidence: "low",
        evidence: [{ id: "hosting.ip", label: "IP", value: ip }],
      },
    };
  }

  const asn = d.connection?.asn ? "AS" + d.connection.asn : "unknown";
  const org = d.connection?.org || "unknown";
  const isp = d.connection?.isp || "unknown";
  const country = d.country || "unknown";
  const isCloudflare = !!d.security?.is_cloudflare;
  const isDatacenter = !!d.security?.is_datacenter;
  const asnExpectedForPlatform = !!(platform && platform.expectedAsns.includes(asn));

  const evidence: EvidenceRow[] = [
    { id: "hosting.ip", label: "IP", value: ip },
    { id: "hosting.asn", label: "ASN", value: asn },
    { id: "hosting.org", label: "Organization", value: org },
    { id: "hosting.isp", label: "ISP", value: isp },
    { id: "hosting.country", label: "Country", value: country + (d.city ? " \u00b7 " + d.city : "") },
  ];

  // Platform case: if the ASN is on the platform's expected list, this is
  // exactly the correct infrastructure. Report it as info.
  if (platform && asnExpectedForPlatform) {
    evidence.push({ id: "hosting.platform", label: "Platform match", value: "ASN " + asn + " matches " + platform.name + " infrastructure." });
    return {
      info: {
        ip, asn, org, isp, country, countryCode: d.country_code || "", city: d.city || "",
        isCloudflare, isDatacenter, asnExpectedForPlatform: true,
      },
      finding: {
        id: "hosting", kind: "hosting", title: "Hosting infrastructure",
        summary: "Hosted on " + platform.name + "'s expected edge network (" + asn + ").",
        severity: "info", confidence: "high", evidence,
      },
    };
  }

  const flags: string[] = [];
  if (isCloudflare) { flags.push("cloudflare"); evidence.push({ id: "hosting.fronting", label: "Fronting", value: "behind Cloudflare \u2014 origin server hidden", bad: true }); }
  const bp = BULLETPROOF_ASNS[asn];
  if (bp) { flags.push("bulletproof"); evidence.push({ id: "hosting.rep", label: "ASN reputation", value: bp, bad: true }); }

  let severity: ScamFinding["severity"] = "info";
  let confidence: ScamFinding["confidence"] = "high";
  if (flags.includes("bulletproof")) severity = "critical";
  else if (flags.includes("cloudflare")) { severity = "low"; confidence = "medium"; }

  const summary = flags.includes("bulletproof")
    ? "Hosted on " + asn + ", a network with a documented history of abuse tolerance."
    : flags.includes("cloudflare")
      ? "Origin IP is proxied through Cloudflare; the real host is hidden."
      : "Hosted on a mainstream datacenter or cloud provider.";

  return {
    info: { ip, asn, org, isp, country, countryCode: d.country_code || "", city: d.city || "", isCloudflare, isDatacenter, asnExpectedForPlatform: false },
    finding: {
      id: "hosting", kind: "hosting", title: "Hosting infrastructure",
      summary, severity, confidence, evidence,
    },
  };
}
