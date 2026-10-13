// Chart specifications — plain data, no SVG strings.
//
// Every spec is derived from values already computed by the scanner.
// No network calls, no randomness, no LLM. Same input -> same output.
//
// Rendering is done by <ScamChartRenderer /> using Recharts. The
// advantage of separating the data from the rendering: exports capture
// the live DOM (which already contains the Recharts SVG), so charts
// come out crisp in PNG without any separate rasterisation path.

import type { ScanReport, ScamFinding, ScamSeverity, ChartSpec } from "./types";

const WEIGHT: Record<ScamSeverity, number> = {
  critical: 100, high: 70, medium: 40, low: 15, info: 0,
}

export function buildChartSpecs(report: ScanReport): ChartSpec[] {
  const out: ChartSpec[] = []

  // 1. Gauge
  out.push({
    type: "gauge",
    score: report.score,
    severity: report.verdictSeverity,
  })

  // 2. Radar
  const axisFor = (id: string, label: string) => {
    const f = report.findings.find((x) => x.id === id)
    if (!f) return null
    return { label, value: WEIGHT[f.severity], severity: f.severity }
  }
  const axes = [
    axisFor("lexical", "Lexical"),
    axisFor("whois", "Domain age"),
    axisFor("dns", "DNS"),
    axisFor("tls", "TLS"),
    axisFor("html", "Content"),
    axisFor("jsbundles", "JavaScript"),
    axisFor("hosting", "Hosting"),
    axisFor("news", "Public warnings"),
  ].filter((x): x is { label: string; value: number; severity: ScamSeverity } => !!x)
  if (axes.length >= 3) {
    out.push({ type: "radar", axes })
  }

  // 3. Domain age
  const whois = report.findings.find((f) => f.kind === "whois")
  if (whois) {
    const ageRow = whois.evidence?.find((r) => r.label === "Registered")
    let ageDays: number | null = null
    if (ageRow) {
      const m = ageRow.value.match(/(\d+) days old/)
      if (m) ageDays = Number(m[1])
    }
    out.push({ type: "domainAge", ageDays })
  }

  // 4. Reputation
  const vt = report.findings.find((f) => f.id === "rep-vt")
  if (vt) {
    const row = (label: string) => {
      const r = vt.evidence?.find((e) => e.label === label)
      return r ? Number(r.value) || 0 : 0
    }
    const total = row("Engines total")
    if (total > 0) {
      out.push({
        type: "reputation",
        total,
        malicious: row("Malicious"),
        suspicious: row("Suspicious"),
        harmless: row("Harmless"),
        undetected: row("Undetected"),
      })
    }
  }

  // 5. DNS checklist
  const dns = report.findings.find((f) => f.kind === "dns")
  if (dns && dns.severity !== "info") {
    const present = (label: string) => {
      const r = dns.evidence?.find((e) => e.label === label)
      if (!r) return false
      return !r.bad && r.value !== "none" && !r.value.startsWith("not ")
    }
    out.push({
      type: "dnsChecklist",
      items: [
        { label: "A record", present: present("A records") },
        { label: "MX record", present: present("MX records") },
        { label: "SPF", present: present("SPF") },
        { label: "DMARC", present: present("DMARC") },
        { label: "CAA", present: present("CAA") },
      ],
    })
  }

  // 6. TLS validity
  const tls = report.findings.find((f) => f.kind === "tls")
  if (tls && tls.severity !== "info") {
    const fromRow = tls.evidence?.find((e) => e.label === "Valid from")
    const toRow = tls.evidence?.find((e) => e.label === "Valid to")
    if (fromRow && toRow) {
      const toClean = toRow.value.replace(/\s*\(.*\)\s*$/, "")
      out.push({ type: "tlsValidity", validFrom: fromRow.value, validTo: toClean })
    }
  }

  // 7. Evidence weight
  const rows = report.findings
    .filter((f) => f.kind !== "verdict" && f.kind !== "narrative" && f.kind !== "chart" && f.kind !== "ai-research" && !f.skippedReason)
    .map((f) => ({ title: f.title, severity: f.severity, weight: WEIGHT[f.severity] }))
    .filter((r) => r.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
  if (rows.length > 0) {
    out.push({ type: "evidenceWeight", rows })
  }

  return out
}

export interface ChartSet {
  id: string
  title: string
  caption: string
  severity: ScamSeverity
  spec: ChartSpec
}

const TITLES: Record<string, { title: string; caption: string }> = {
  gauge: { title: "Risk score", caption: "Weighted sum of every finding. Recomputed from raw signals, not from any model." },
  radar: { title: "Signal breakdown", caption: "Per-layer severity mapped to 0-100. Outer edge means the layer produced a critical finding." },
  domainAge: { title: "Domain age", caption: "Days since registration, bucketed against common phishing thresholds." },
  reputation: { title: "Reputation engines", caption: "Verdicts from independent anti-abuse engines." },
  dnsChecklist: { title: "DNS & email authentication", caption: "Presence of standard records a legitimate mail-sending domain should have." },
  tlsValidity: { title: "Certificate validity", caption: "Window between issued and expiry dates, with today marked." },
  evidenceWeight: { title: "Evidence contribution", caption: "How much each finding contributed to the final score." },
}

export function buildChartSet(report: ScanReport): ChartSet[] {
  const specs = buildChartSpecs(report)
  return specs.map((spec, i) => {
    const meta = TITLES[spec.type] || { title: spec.type, caption: "" }
    let severity: ScamSeverity = report.verdictSeverity
    if (spec.type === "domainAge") {
      const f = report.findings.find((x) => x.kind === "whois")
      if (f) severity = f.severity
    }
    if (spec.type === "reputation") {
      const f = report.findings.find((x) => x.id === "rep-vt")
      if (f) severity = f.severity
    }
    return {
      id: "chart." + spec.type + "." + i,
      title: meta.title,
      caption: meta.caption,
      severity,
      spec,
    }
  })
}