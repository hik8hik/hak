"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { severityVar } from "@/lib/colors";

const LINES = 15;
const HARD_CEILING = 88;

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c] as string));
}

export default function SheetView({ items, onReady }: { items: ThreatItem[]; onReady?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(40);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const H = wrap.clientHeight;
    if (!H) return;
    const LH = H / LINES;
    const cap = Math.min(HARD_CEILING, LH * 0.92);
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;left:-99999px;top:0;white-space:nowrap;"
    probe.style.width = wrap.clientWidth + "px";
    probe.style.lineHeight = LH + "px";
    probe.style.fontFamily = getComputedStyle(wrap).fontFamily;
    document.body.appendChild(probe);
    const rowsHtml = items.slice(0, LINES).map(
      (it) => `<div style="overflow:hidden;text-overflow:ellipsis"><b style="color:${severityVar(it.severity)}">${escapeHtml(it.id)}</b> &mdash; ${escapeHtml(it.title)}</div>`
    ).join("");
    let lo = 6, hi = Math.max(6, cap), best = 6;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      probe.style.fontSize = mid + "px";
      probe.innerHTML = rowsHtml;
      if (probe.scrollHeight <= LH * LINES + 1) { best = mid; lo = mid; }
      else { hi = mid; }
    }
    document.body.removeChild(probe);
    setLineHeight(LH); setFontSize(best);
    requestAnimationFrame(() => onReady && onReady());
  }, [items, onReady]);

  return (
    <div className="sheet-wrap" ref={wrapRef}>
      <div className="sheet-inner raised" style={{ fontSize, lineHeight: lineHeight + "px" }}>
        {items.slice(0, LINES).map((it, i) => (
          <div className="sheet-row" key={it.id + i}>
            <span className="sheet-id" style={{ color: severityVar(it.severity) }}>{it.id}</span>
            <span className="sheet-title">{it.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}