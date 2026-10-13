"use client";
import { useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { severityVar } from "@/lib/colors";
import ThreatCard from "./ThreatCard";

export default function StackScan() {
  const [text, setText] = useState("{\n  \"dependencies\": {\n    \"log4j-core\": \"2.14.1\",\n    \"lodash\": \"4.17.20\"\n  }\n}")
  const [hits, setHits] = useState<ThreatItem[] | null>(null)
  async function scan() {
    setHits(null)
    const r = await fetch("/api/stack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
    const d = await r.json()
    setHits(Array.isArray(d) ? d : [])
  }
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Stack scan</h2>
      <p className="muted small">Paste package.json, requirements.txt, or go.mod. We match against a curated CVE set.</p>
      <div className="pane raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} style={{ minHeight: 220 }} />
        <div className="row"><button className="btn" onClick={scan}>Scan</button>
          <span className="small muted">Best-effort matching in v1 — v2 will use real CPEs.</span>
        </div>
      </div>
      {hits && (
        hits.length === 0
          ? <p className="muted" style={{ marginTop: 16 }}>No matches in the curated set.</p>
          : <div className="feed" style={{ marginTop: 16 }}>
              {hits.map((h) => <ThreatCard key={h.id} item={h} exportable />)}
            </div>
      )}
    </div>
  );
}