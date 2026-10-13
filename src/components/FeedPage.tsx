"use client";
import { useEffect, useState } from "react";
import Header from "./Header";
import SettingsDrawer from "./SettingsDrawer";
import Feed from "./Feed";
import ThreatCard from "./ThreatCard";
import SheetView from "./SheetView";
import QueueBar from "./QueueBar";
import { useSettings, type ViewMode } from "@/context/SettingsContext";
import { FALLBACK } from "@/lib/fallback";
import type { ThreatItem } from "@/lib/types";

interface SP { view?: string; id?: string; topic?: string; q?: string; source?: string; }

export default function FeedPage({ searchParams, cookieView }: { searchParams: SP; cookieView: ViewMode }) {
  const { set } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [single, setSingle] = useState<ThreatItem | null>(null);
  const [sheetItems, setSheetItems] = useState<ThreatItem[] | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("hak.settings")) set("viewMode", cookieView);
  }, [cookieView, set]);

  useEffect(() => {
    if (searchParams.view !== "card" || !searchParams.id) { setSingle(null); return; }
    let cancel = false;
    fetch(`/api/threat?id=${encodeURIComponent(searchParams.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancel) setSingle(d ?? FALLBACK.find((x) => x.id === searchParams.id) ?? FALLBACK[0]); })
      .catch(() => { if (!cancel) setSingle(FALLBACK[0]); });
    return () => { cancel = true; };
  }, [searchParams.view, searchParams.id]);

  useEffect(() => {
    if (searchParams.view !== "sheet") { setSheetItems(null); return; }
    let cancel = false;
    const topic = searchParams.topic || "kev";
    fetch(`/api/feed?source=${topic}`)
      .then((r) => r.json())
      .then((d) => { if (!cancel) setSheetItems(Array.isArray(d) ? d : FALLBACK); })
      .catch(() => { if (!cancel) setSheetItems(FALLBACK); });
    return () => { cancel = true; };
  }, [searchParams.view, searchParams.topic]);

  return (
    <div className="app">
      <Header onOpenSettings={() => setDrawerOpen(true)} />
      <main className="main">
        {searchParams.view === "sheet" ? (
          sheetItems ? <SheetView items={sheetItems} /> : <p className="muted">Loading sheet…</p>
        ) : searchParams.view === "card" ? (
          single ? <ThreatCard item={single} exportable /> : <p className="muted">Loading item…</p>
        ) : searchParams.q ? (
          <FuzzyResults q={searchParams.q} />
        ) : (
          <Feed source={(searchParams.source as any) || "cve"} />
        )}
      </main>
      <SettingsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <QueueBar />
    </div>
  );
}

function FuzzyResults({ q }: { q: string }) {
  const needle = q.toLowerCase();
  const hits = FALLBACK.filter(
    (it) => it.title.toLowerCase().includes(needle) || it.id.toLowerCase().includes(needle) || it.summary.toLowerCase().includes(needle)
  );
  if (!hits.length) return <p className="muted">No fuzzy match for &ldquo;{q}&rdquo;.</p>;
  return <div className="feed">{hits.map((it) => <ThreatCard key={it.id} item={it} exportable />)}</div>;
}
