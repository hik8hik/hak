"use client";
import { useEffect, useMemo, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { makeQuestion, type Question } from "@/lib/quiz";

export default function Quiz() {
  const [pool, setPool] = useState<ThreatItem[] | null>(null);
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  useEffect(() => {
    fetch("/api/feed?source=attack")
      .then((r) => r.json())
      .then((d) => setPool(Array.isArray(d) ? d : []))
      .catch(() => setPool([]));
  }, []);
  useEffect(() => { if (pool && pool.length >= 4) setQ(makeQuestion(pool)); }, [pool]);
  if (!pool) return <p className="muted">Loading quiz…</p>;
  if (!q) return <p className="muted">Not enough data for a quiz.</p>;
  function answer(id: string) {
    if (picked) return;
    setPicked(id);
    if (id === q!.answer) { setScore((s) => s + 1); setStreak((s) => { const n = s + 1; setBest((b) => Math.max(b, n)); return n; }) }
    else setStreak(0)
    setTimeout(() => {
      setPicked(null)
      setQ(makeQuestion(pool!))
    }, 1200)
  }
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Quiz</h2>
        <div className="spacer" />
        <span className="pill">Score {score}</span>
        <span className="pill">Streak {streak}</span>
        <span className="pill">Best {best}</span>
      </div>
      <div className="card raised" style={{ padding: 22 }}>
        <div className="small muted">{q.promptKind}</div>
        <h3 style={{ margin: "6px 0 18px" }}>{q.prompt}</h3>
        {q.options.map((o) => {
          const state = picked
            ? (o.id === q.answer ? "right" : (o.id === picked ? "wrong" : undefined))
            : undefined;
          return (
            <button key={o.id} className="btn quiz-opt" data-state={state} onClick={() => answer(o.id)}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}