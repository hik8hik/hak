"use client";
import { useEffect, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { severityVar } from "@/lib/colors";
import { buildBrief } from "@/lib/brief";

export default function DailyBrief() {
  const [kev, setKev] = useState<ThreatItem[]>([]);
  const [cve, setCve] = useState<ThreatItem[]>([]);
  const [attack, setAttack] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch("/api/feed?source=kev").then((r) => r.json()).catch(() => []),
      fetch("/api/feed?source=cve").then((r) => r.json()).catch(() => []),
      fetch("/api/feed?source=attack").then((r) => r.json()).catch(() => []),
    ]).then(([k, c, a]) => {
      setKev(Array.isArray(k) ? k : []); setCve(Array.isArray(c) ? c : []); setAttack(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);
  if (loading) return <p className="muted">Building brief…</p>;
  const brief = buildBrief({ kev, cve, attack });
  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Daily brief</h2>
        <div className="spacer" />
        <button className="btn" onClick={() => {
          const md = brief.sections.map((s) => `## ${s.title}\n\n` + s.items.map((x) => `- **${x.id}** — ${x.title}`).join("\n")).join("\n\n")
          navigator.clipboard.writeText(md)
        }}>Copy Markdown</button>
      </div>
      <div className="brief">
        {brief.sections.map((s, i) => (
          <div className="pane raised" key={i}>
            <h3>{s.title}</h3>
            <ul>
              {s.items.map((it) => (
                <li key={it.id}>
                  <a href={`/?view=card&id=${encodeURIComponent(it.id)}`}>
                    <b style={{ color: severityVar(it.severity) }}>{it.id}</b></a> — {it.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}