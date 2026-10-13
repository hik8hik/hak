"use client";
import { useEffect, useMemo, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { tacticVar } from "@/lib/colors";
import { flashcardsCsv } from "@/lib/flashcards";

export default function Flashcards() {
  const [items, setItems] = useState<ThreatItem[] | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    fetch("/api/feed?source=attack")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);
  const list = useMemo(() => (items || []).slice(0, 60), [items]);
  if (!items) return <p className="muted">Loading deck…</p>;
  if (!list.length) return <p className="muted">No deck available.</p>;
  const cur = list[i % list.length];
  function next() { setFlipped(false); setI((x) => (x + 1) % list.length); }
  function prev() { setFlipped(false); setI((x) => (x - 1 + list.length) % list.length); }
  function csv() {
    const blob = new Blob([flashcardsCsv(list)], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "hak-flashcards.csv"
    a.click()
  }
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Flashcards</h2>
        <div className="spacer" />
        <span className="small muted">{i + 1} / {list.length}</span>
        <button className="btn" onClick={csv}>Export CSV (Anki)</button>
      </div>
      <div className="flip" data-flipped={flipped} onClick={() => setFlipped((v) => !v)}>
        <div className="inner raised">
          <div className="face front">
            <div className="small muted">{cur.tactics?.[0] || cur.kind.toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700 }}>{cur.id}</div>
            <div className="small muted">click to flip</div>
          </div>
          <div className="face back raised">
            <h3 style={{ margin: 0 }}>{cur.title}</h3>
            <p className="muted small" style={{ margin: 0 }}>{cur.summary.slice(0, 320)}</p>
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
        <button className="btn" onClick={prev}>← Prev</button>
        <button className="btn" onClick={next}>Next →</button>
      </div>
    </div>
  );
}