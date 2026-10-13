"use client";
import Header from "@/components/Header";
import QueueBar from "@/components/QueueBar";
import { useQueue } from "@/context/QueueContext";
import ThreatCard from "@/components/ThreatCard";
export default function QueuePage() {
  const { items } = useQueue();
  return (
    <div className="app">
      <Header />
      <main className="main">
        <h2 style={{ marginTop: 0 }}>Export queue</h2>
        <p className="muted small">Star items in the feed to add them here. Export all as a ZIP of PNGs, or as one Markdown file.</p>
        {items.length === 0 ? (
          <p className="muted">Queue is empty. Head to the <a href="/">feed</a>.</p>
        ) : (
          <div className="feed">{items.map((it) => <ThreatCard key={it.id} item={it} />)}</div>
        )}
        <QueueBar />
      </main>
    </div>
  );
}
