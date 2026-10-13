"use client";
import { useEffect, useRef, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { severityVar, tacticVar } from "@/lib/colors";
import { rasteriseHtml, download, surfaceColor } from "@/lib/export";
import { PRESETS, type ExportPreset } from "@/lib/types";
import { buildQueueHtml } from "@/lib/queueRender";
import { toMarkdown } from "@/lib/markdown";
import { useQueue } from "@/context/QueueContext";
import { useSettings } from "@/context/SettingsContext";

function pixelTag(p: ExportPreset) {
  return (p.w * p.pr) + "x" + (p.h * p.pr);
}

export default function ThreatCard({ item, exportable = false }: { item: ThreatItem; exportable?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [epss, setEpss] = useState<{ p: number; pct: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const sevColor = severityVar(item.severity);
  const { has, toggle } = useQueue();
  const { s } = useSettings();

  useEffect(() => {
    if (item.kind !== "cve" && item.kind !== "kev") return;
    let cancelled = false;
    fetch("/api/epss?cve=" + encodeURIComponent(item.id))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setEpss(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.id, item.kind]);

  async function exportAt(p: ExportPreset, pixelRatio?: number) {
    if (busy) return;
    setBusy(true);
    try {
      const html = buildQueueHtml(item, p);
      const url = await rasteriseHtml(html, {
        width: p.w,
        height: p.h,
        pixelRatio: pixelRatio ?? p.pr,
        background: surfaceColor(),
      });
      const tag = pixelRatio
        ? (p.w * pixelRatio) + "x" + (p.h * pixelRatio)
        : pixelTag(p);
      download(url, item.id + "-" + tag + ".png");
    } finally {
      setBusy(false);
    }
  }

  async function exportFast(pr: number) {
    const base = PRESETS.find((x) => x.id === "post4k") || PRESETS[2];
    await exportAt(base, pr);
  }

  async function copyMd() {
    await navigator.clipboard.writeText(toMarkdown(item));
  }

  return (
    <div className="card raised" ref={cardRef} style={s.accentColor ? { borderTop: "2px solid " + s.accentColor } : undefined}>
      <div className="card-head">
        <span className="card-id mono">{item.id}</span>
        <span className="pill" style={{ color: sevColor }}>
          <span className="dot" style={{ background: sevColor }} />
          {item.severity ?? "none"}
        </span>
        {epss && (
          <span className="pill" title="EPSS: probability of exploitation in next 30d">
            EPSS {(epss.p * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      {item.tactics && item.tactics.length > 0 && (
        <div className="tactics">
          {item.tactics.map((t) => (
            <span key={t} className="pill" style={{ color: tacticVar(t) }}>
              <span className="dot" style={{ background: tacticVar(t) }} />{t}
            </span>
          ))}
        </div>
      )}
      {exportable && (
        <div className="card-actions">
          <button className="star" data-on={has(item.id)} onClick={() => toggle(item)} title="Add to export queue">★</button>
          <button className="btn small" onClick={copyMd} title="Copy as Markdown">MD</button>
          <button className="btn small" disabled={busy} onClick={() => exportFast(4)}>4x</button>
          <button className="btn small" disabled={busy} onClick={() => exportFast(8)}>8x</button>
          <div className="seg">
            {PRESETS.map((p) => (
              <button key={p.id} disabled={busy} onClick={() => exportAt(p)}>{p.label}</button>
            ))}
          </div>
        </div>
      )}
      {s.watermark && (
        <div className="small muted" style={{ marginTop: 6, textAlign: "right" }}>
          {s.watermarkText || "hak"}
        </div>
      )}
    </div>
  );
}