"use client";
import type { ScamFinding } from "@/lib/scam/types";
import ScamChartRenderer from "./ScamChartRenderer";

const SEV_COLOR: Record<string, string> = {
  critical: "var(--cs-critical)",
  high: "var(--cs-high)",
  medium: "var(--cs-medium)",
  low: "var(--cs-low)",
  info: "var(--cs-none)",
};

export default function ScamFindingCard({ finding }: { finding: ScamFinding }) {
  const sev = SEV_COLOR[finding.severity] || SEV_COLOR.info
  const isVerdict = finding.kind === "verdict"
  return (
    <div className="card raised" style={{ borderTop: "4px solid " + sev, gridColumn: isVerdict ? "1 / -1" : undefined }}>
      <div className="card-head">
        <span className="card-id mono">{finding.id}</span>
        <span className="pill">{finding.kind}</span>
        <span className="pill" style={{ color: sev }}>
          <span className="dot" style={{ background: sev }} />
          {finding.severity}
        </span>
      </div>
      <h3 style={{ fontSize: isVerdict ? 22 : 17 }}>{finding.title}</h3>
      <p>{finding.summary}</p>
      {finding.chart && (
        <div
          style={{
            marginTop: 12,
            padding: "16px 10px",
            background: "var(--surface-2)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <ScamChartRenderer spec={finding.chart} />
        </div>
      )}
      {finding.evidence && finding.evidence.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          {finding.evidence.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
                gap: 10,
                padding: "6px 10px",
                borderRadius: 8,
                background: "var(--surface-2)",
                borderLeft: row.bad ? "3px solid " + sev : "3px solid transparent",
                fontSize: 12.5,
              }}
            >
              <div style={{ color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, fontWeight: 600 }}>
                {row.label}
              </div>
              <div className="mono" style={{ wordBreak: "break-word" }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
      {finding.references && finding.references.length > 0 && (
        <div className="small muted" style={{ marginTop: 6 }}>
          {finding.references.map((r, i) => (
            <div key={i}><a href={r} target="_blank" rel="noreferrer">{r}</a></div>
          ))}
        </div>
      )}
    </div>
  );
}