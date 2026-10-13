"use client";
import type { ScamSeverity } from "@/lib/scam/types";

const SEV_COLOR: Record<string, string> = {
  critical: "var(--cs-critical)",
  high: "var(--cs-high)",
  medium: "var(--cs-medium)",
  low: "var(--cs-low)",
  info: "var(--cs-none)",
}

export interface ChartCardProps {
  title: string
  caption: string
  severity: ScamSeverity
  svg: string
}

export default function ScamChartCard({ title, caption, severity, svg }: ChartCardProps) {
  const sev = SEV_COLOR[severity] || SEV_COLOR.info
  return (
    <div className="card raised" style={{ borderTop: "4px solid " + sev, overflow: "hidden", gridColumn: "1 / -1" }}>
      <div className="card-head">
        <span className="card-id mono">chart</span>
        <span className="pill" style={{ color: sev }}>
          <span className="dot" style={{ background: sev }} />
          {severity}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{caption}</p>
      <div
        style={{
          marginTop: 12,
          padding: "16px 8px",
          background: "var(--surface-2)",
          borderRadius: 12,
          overflow: "hidden",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}