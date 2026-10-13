import type { ScamFinding, EvidenceRow } from "./types";
import type { Platform } from "./platforms";

interface RdapEvent { eventAction: string; eventDate: string; }
interface RdapEntity { roles?: string[]; vcardArray?: unknown[]; }
interface RdapNs { ldhName?: string; }
interface Rdap {
  ldhName?: string; status?: string[]; events?: RdapEvent[];
  entities?: RdapEntity[]; nameservers?: RdapNs[];
  secureDNS?: { delegationSigned?: boolean };
}

function registrarName(entity: RdapEntity): string | null {
  const vc = entity.vcardArray as any[] | undefined;
  if (!Array.isArray(vc) || vc.length < 2) return null;
  const rows = vc[1];
  if (!Array.isArray(rows)) return null;
  for (const row of rows as any[][]) {
    if (Array.isArray(row) && row[0] === "fn" && row.length >= 4) return String(row[3]);
  }
  return null;
}

function daysBetween(iso: string): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export interface RdapResult {
  finding: ScamFinding;
  ageDays: number | null;
  registrar: string | null;
}

export async function runRdap(
  registrable: string,
  platform: Platform | null,
): Promise<RdapResult> {
  // Platform case: registrable domain is the platform's own, registration
  // is old and irrelevant to the subdomain operator.
  if (platform) {
    return {
      finding: {
        id: "whois", kind: "whois", title: "Registration (RDAP)",
        summary: "Registrable domain " + registrable + " is the " + platform.name + " platform domain. Registration age does not reflect the subdomain operator.",
        severity: "info", confidence: "high",
        evidence: [
          { id: "whois.platform", label: "Platform domain", value: registrable },
          { id: "whois.note", label: "Note", value: "Platform-managed subdomain \u2014 RDAP age is not operator-controlled." },
        ],
      },
      ageDays: null, registrar: null,
    };
  }

  let data: Rdap | null = null;
  let error: string | null = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://rdap.org/domain/" + encodeURIComponent(registrable), {
      headers: { Accept: "application/rdap+json, application/json" },
      cache: "no-store", signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.ok) data = (await r.json()) as Rdap;
    else error = "RDAP HTTP " + r.status;
  } catch (e) { error = String(e); }

  if (!data) {
    return {
      finding: {
        id: "whois", kind: "whois", title: "Registration (RDAP)",
        summary: "No RDAP record available: " + (error || "unknown reason"),
        severity: "info", confidence: "low",
        evidence: [{ id: "whois.query", label: "Queried", value: registrable }],
      },
      ageDays: null, registrar: null,
    };
  }

  const reg = (data.events || []).find((e) => e.eventAction === "registration")?.eventDate;
  const exp = (data.events || []).find((e) => e.eventAction === "expiration")?.eventDate;
  const upd = (data.events || []).find((e) => e.eventAction === "last changed")?.eventDate;
  const ageDays = reg ? daysBetween(reg) : null;
  const regEntity = (data.entities || []).find((e) => (e.roles || []).includes("registrar"));
  const registrar = regEntity ? registrarName(regEntity) : null;
  const nsList = (data.nameservers || []).map((n) => (n.ldhName || "").toLowerCase()).filter(Boolean);
  const statusList = data.status || [];
  const dnssec = data.secureDNS?.delegationSigned;

  const evidence: EvidenceRow[] = [];
  if (reg) {
    const ageLabel = ageDays === null ? "unknown" : ageDays + " days old";
    evidence.push({ id: "whois.reg", label: "Registered", value: reg.slice(0, 10) + " (" + ageLabel + ")", bad: ageDays !== null && ageDays < 30 });
  }
  if (exp) evidence.push({ id: "whois.exp", label: "Expires", value: exp.slice(0, 10) });
  if (upd) evidence.push({ id: "whois.upd", label: "Last changed", value: upd.slice(0, 10) });
  if (registrar) evidence.push({ id: "whois.registrar", label: "Registrar", value: registrar });
  if (nsList.length) evidence.push({ id: "whois.ns", label: "Nameservers", value: nsList.join(", ") });
  if (statusList.length) evidence.push({ id: "whois.status", label: "Status codes", value: statusList.join(", ") });
  evidence.push({ id: "whois.dnssec", label: "DNSSEC", value: dnssec ? "signed" : "not signed", bad: !dnssec });

  // Severity tiers tuned so that only very young domains are critical.
  let severity: ScamFinding["severity"] = "info";
  let confidence: ScamFinding["confidence"] = "high";
  if (ageDays !== null && ageDays < 14) severity = "critical";
  else if (ageDays !== null && ageDays < 30) severity = "high";
  else if (ageDays !== null && ageDays < 180) severity = "medium";
  else if (ageDays !== null && ageDays < 365) severity = "low";

  const summary =
    ageDays === null ? "Registration records retrieved."
    : ageDays < 14 ? "Domain registered " + ageDays + " days ago \u2014 extremely young."
    : ageDays < 30 ? "Domain is under one month old."
    : ageDays < 180 ? "Domain is under six months old."
    : "Domain is well-established (" + Math.round(ageDays / 365 * 10) / 10 + " years).";

  return {
    finding: {
      id: "whois", kind: "whois", title: "Registration (RDAP)",
      summary, severity, confidence, evidence,
    },
    ageDays, registrar,
  };
}
