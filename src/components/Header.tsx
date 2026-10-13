"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";

export default function Header({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const router = useRouter();
  const { s, set } = useSettings();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = q.trim(); if (!raw) return;
    const up = raw.toUpperCase();
    if (up === "KEV") return router.push("/?view=sheet&topic=kev");
    if (/^CVE-\d{4}-\d+$/.test(up)) return router.push(`/?view=card&id=${up}`);
    if (/^T\d{4}(\.\d{3})?$/.test(up)) return router.push(`/?view=card&id=${up}`);
    if (/^CWE-\d+$/.test(up)) return router.push(`/?view=card&id=${up}`);
    router.push(`/?q=${encodeURIComponent(raw)}`);
  }
  function cycleTheme() {
    const order = ["light", "dark", "black", "auto"] as const;
    const i = order.indexOf(s.theme);
    set("theme", order[(i + 1) % order.length]);
  }

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" />
        <span>hak</span>
      </div>
      <form className="search inset-sm" onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="CVE-2024-3094 · T1059.001 · CWE-79 · KEV · XSS" spellCheck={false} />
      </form>
      <nav className="nav">
        <a className="btn" href="/brief">Brief</a>
        <a className="btn" href="/weekly">Weekly</a>
        <a className="btn" href="/flashcards">Cards</a>
        <a className="btn" href="/quiz">Quiz</a>
        <a className="btn" href="/stack">Stack</a>
        <a className="btn" href="/scam">Scam</a>
        <a className="btn" href="/queue">Queue</a>
        <a className="btn" href="/studio">Studio</a>
        <a className="btn" href="/content">Content</a>
        <button className="btn" onClick={cycleTheme}>{s.theme}</button>
        {onOpenSettings && <button className="btn" onClick={onOpenSettings}>Settings</button>}
      </nav>
    </header>
  );
}
