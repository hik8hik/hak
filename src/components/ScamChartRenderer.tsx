"use client";
import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer,
         RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts"
import type { ChartSpec, ScamSeverity } from "@/lib/scam/types"

const SEV_COLOR: Record<ScamSeverity, string> = {
  critical: "#DD0008",
  high: "#FF7E1E",
  medium: "#FFC107",
  low: "#4ECB4A",
  info: "#8892a6",
}

// ─── Error boundary ─────────────────────────────────────────────────
//
// Recharts can crash on certain shapes (especially under React 19).
// Wrapping every chart in this boundary keeps a single bad chart
// from taking down the whole card.

interface EBProps { children: React.ReactNode; label: string }
interface EBState { hasError: boolean }

class ChartErrorBoundary extends React.Component<EBProps, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError(): EBState { return { hasError: true } }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[hak] chart render failed (" + this.props.label + "):", error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "14px 10px", fontSize: 13, color: "var(--text-dim)" }}>
          Chart unavailable (render error).
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Dispatcher ─────────────────────────────────────────────────────

export default function ScamChartRenderer({ spec }: { spec: ChartSpec }) {
  switch (spec.type) {
    case "gauge":          return <B label="gauge"><Gauge spec={spec} /></B>
    case "radar":          return <B label="radar"><RadarChartView spec={spec} /></B>
    case "domainAge":      return <B label="domainAge"><DomainAge spec={spec} /></B>
    case "reputation":     return <B label="reputation"><Reputation spec={spec} /></B>
    case "dnsChecklist":   return <B label="dnsChecklist"><DnsChecklist spec={spec} /></B>
    case "tlsValidity":    return <B label="tlsValidity"><TlsValidity spec={spec} /></B>
    case "evidenceWeight": return <B label="evidenceWeight"><EvidenceWeight spec={spec} /></B>
    default:               return null
  }
}

function B({ label, children }: { label: string; children: React.ReactNode }) {
  return <ChartErrorBoundary label={label}>{children}</ChartErrorBoundary>
}

// ─── Gauge — PieChart semicircle ────────────────────────────────────
//
// Polar path only. No categorical axis map. Reliable under React 19.

function Gauge({ spec }: { spec: Extract<ChartSpec, { type: "gauge" }> }) {
  const score = Math.max(0, Math.min(100, spec.score))
  const color = SEV_COLOR[spec.severity]
  const data = useMemo(() => [
    { name: "score", value: score, fill: color },
    { name: "rest",  value: 100 - score, fill: "rgba(255,255,255,0.06)" },
  ], [score, color])

  return (
    <div style={{ position: "relative", width: "100%", height: 240, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="90%"
            startAngle={180}
            endAngle={0}
            innerRadius="65%"
            outerRadius="100%"
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", left: 0, right: 0, top: "55%", textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, color: color, letterSpacing: "-0.03em" }}>
          {score}
        </div>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--text-dim)", textTransform: "uppercase", marginTop: 4 }}>
          Risk score
        </div>
      </div>
    </div>
  )
}

// ─── Radar — polar path with explicit axis IDs ──────────────────────

function RadarChartView({ spec }: { spec: Extract<ChartSpec, { type: "radar" }> }) {
  const data = spec.axes.map((a) => ({
    axis: a.label,
    value: Math.max(0, Math.min(100, a.value)),
  }))
  if (data.length < 3) {
    return <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Not enough axes to draw a radar chart.</div>
  }
  return (
    <div style={{ width: "100%", height: 320, minHeight: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.10)" />
          <PolarAngleAxis dataKey="axis" angleAxisId={0} tick={{ fill: "#8b97b0", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} radiusAxisId={0} tick={false} axisLine={false} />
          <Radar
            name="severity"
            dataKey="value"
            angleAxisId={0}
            radiusAxisId={0}
            stroke="#7BA5FF"
            fill="#7BA5FF"
            fillOpacity={0.25}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── HTML bars — no Recharts ────────────────────────────────────────
//
// Every remaining chart is a simple horizontal bar list. Rendering
// them as plain HTML avoids the categorical axis-map path that
// crashes under React 19, and gives identical visuals.

interface BarRow { label: string; value: number; max: number; fill: string; right?: string }

function Bars({ rows, labelWidth = 110 }: { rows: BarRow[]; labelWidth?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r, i) => {
        const pct = r.max <= 0 ? 0 : Math.min(100, Math.max(2, (r.value / r.max) * 100))
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: labelWidth + "px 1fr 40px", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#8b97b0", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.label}
            </div>
            <div style={{ position: "relative", height: 18, background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", background: r.fill, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: "#e6ecf5", fontWeight: 700, textAlign: "right" }}>
              {r.right !== undefined ? r.right : r.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Domain age ─────────────────────────────────────────────────────

const AGE_BUCKETS = [
  { label: "<7d",     max: 7 },
  { label: "7-30d",   max: 30 },
  { label: "1-6mo",   max: 180 },
  { label: "6-12mo",  max: 365 },
  { label: "1yr+",    max: Number.POSITIVE_INFINITY },
]

function DomainAge({ spec }: { spec: Extract<ChartSpec, { type: "domainAge" }> }) {
  const age = spec.ageDays
  const rows: BarRow[] = AGE_BUCKETS.map((b, i) => {
    const prev = i === 0 ? 0 : AGE_BUCKETS[i - 1].max
    const here = age !== null && age >= prev && age < b.max
    const fill = here
      ? age! < 14 ? "#DD0008"
        : age! < 30 ? "#FF7E1E"
        : age! < 180 ? "#FFC107"
        : "#4ECB4A"
      : "rgba(255,255,255,0.06)"
    return { label: b.label, value: here ? 100 : 0, max: 100, fill }
  })
  const headline =
    age === null ? "Domain age unknown" :
    age < 14    ? age + " days old \u2014 extremely young" :
    age < 30    ? age + " days old" :
    age < 180   ? Math.round(age / 30) + " months old" :
                  (Math.round(age / 365 * 10) / 10) + " years old"
  return (
    <div>
      <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 14 }}>{headline}</div>
      <Bars rows={rows} labelWidth={70} />
    </div>
  )
}

// ─── Reputation ─────────────────────────────────────────────────────

function Reputation({ spec }: { spec: Extract<ChartSpec, { type: "reputation" }> }) {
  const clean = spec.harmless + spec.undetected
  const max = Math.max(1, spec.malicious, spec.suspicious, clean)
  const rows: BarRow[] = [
    { label: "Malicious",  value: spec.malicious,  max, fill: "#DD0008" },
    { label: "Suspicious", value: spec.suspicious, max, fill: "#FF7E1E" },
    { label: "Clean",      value: clean,          max, fill: "#4ECB4A" },
  ]
  return (
    <div>
      <Bars rows={rows} labelWidth={90} />
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
        {spec.total} engines queried
      </div>
    </div>
  )
}

// ─── DNS checklist ──────────────────────────────────────────────────

function DnsChecklist({ spec }: { spec: Extract<ChartSpec, { type: "dnsChecklist" }> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {spec.items.map((it, i) => {
        const color = it.present ? "#4ECB4A" : "#DD0008"
        const mark = it.present ? "\u2713" : "\u2715"
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: color + "22", color, fontWeight: 800, fontSize: 13,
            }}>{mark}</span>
            <span style={{ fontWeight: 500 }}>{it.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── TLS validity ───────────────────────────────────────────────────

function TlsValidity({ spec }: { spec: Extract<ChartSpec, { type: "tlsValidity" }> }) {
  const from = Date.parse(spec.validFrom)
  const to = Date.parse(spec.validTo)
  const now = Date.now()
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    return <div style={{ fontSize: 13, color: "var(--text-dim)" }}>TLS validity window unavailable</div>
  }
  const pad = (to - from) * 0.10
  const lo = from - pad
  const hi = to + pad
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100
  const fromPct = pct(from)
  const toPct = pct(to)
  const nowPct = pct(now)
  const daysLeft = Math.round((to - now) / 86400000)
  const expired = daysLeft < 0
  const color = expired ? "#DD0008" : daysLeft < 15 ? "#FF7E1E" : "#4ECB4A"
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 10 }}>
        {expired ? "Expired " + Math.abs(daysLeft) + " days ago" : daysLeft + " days until expiry"}
      </div>
      <div style={{ position: "relative", height: 26, background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
        <div style={{ position: "absolute", left: fromPct + "%", width: Math.max(0, toPct - fromPct) + "%", top: 0, bottom: 0, background: color + "66", border: "1.5px solid " + color, borderRadius: 4 }} />
        {nowPct >= 0 && nowPct <= 100 && (
          <div style={{ position: "absolute", left: nowPct + "%", top: -6, bottom: -4, width: 2, background: "#7BA5FF" }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
        <span>Issued {spec.validFrom.slice(0, 10)}</span>
        <span>Expires {spec.validTo.slice(0, 10)}</span>
      </div>
    </div>
  )
}

// ─── Evidence weight ────────────────────────────────────────────────

function EvidenceWeight({ spec }: { spec: Extract<ChartSpec, { type: "evidenceWeight" }> }) {
  const max = Math.max(1, ...spec.rows.map((r) => r.weight))
  const rows: BarRow[] = spec.rows.map((r) => ({
    label: r.title.length > 26 ? r.title.slice(0, 24) + "\u2026" : r.title,
    value: r.weight,
    max,
    fill: SEV_COLOR[r.severity],
  }))
  return <Bars rows={rows} labelWidth={170} />
}