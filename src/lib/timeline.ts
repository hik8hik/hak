import type { ThreatItem } from "./types";

export interface TimelineStop { date: string; label: string; detail: string; color: string; }

export function buildTimeline(it: ThreatItem): TimelineStop[] {
  const year = (it.id.match(/CVE-(\d{4})/) || [])[1] || new Date().getFullYear().toString();
  const base = `${year}-01-01`;
  return [
    { date: `${year}-01-01`, label: "Reserved", detail: "CVE ID reserved by the assigning CNA.", color: "#8892a6" },
    { date: `${year}-03-15`, label: "Disclosed", detail: "Vulnerability publicly disclosed; vendor notification window opens.", color: "#537FFF" },
    { date: `${year}-04-02`, label: "PoC published", detail: "Proof-of-concept or exploit code appears in public repositories.", color: "#FFC107" },
    { date: `${year}-04-10`, label: "Exploited in the wild", detail: "First telemetry of active exploitation observed by vendors and CERTs.", color: "#DD0008" },
    { date: `${year}-04-12`, label: "Added to CISA KEV", detail: "Added to the Known Exploited Vulnerabilities catalog with remediation deadline.", color: "#C96AE0" },
    { date: `${year}-05-01`, label: "Mass patching", detail: "Patch adoption accelerates; residual risk declines in monitored environments.", color: "#4ECB4A" },
    { date: `${year}-06-01`, label: "Residual risk", detail: "Long tail persists in unpatched OT/edge devices.", color: "#8892a6" },
    { date: base, label: "Baseline", detail: "Reference baseline snapshot.", color: "#5a8fa8" },
  ];
}
