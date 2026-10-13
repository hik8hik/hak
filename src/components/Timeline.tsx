"use client";
import { useEffect, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import { buildTimeline, type TimelineStop } from "@/lib/timeline";

export default function TimelineView({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ThreatItem | null>(null);
  const [stops, setStops] = useState<TimelineStop[] | null>(null);
  useEffect(() => {
    let cancel = false;
    fetch(`/api/threat?id=${encodeURIComponent(itemId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancel) return;
        setItem(d); setStops(d ? buildTimeline(d) : []);
      }).catch(() => { if (!cancel) setStops([]); });
    return () => { cancel = true; };
  }, [itemId]);
  if (!stops) return <p className="muted">Loading timeline…</p>;
  if (!item) return <p className="muted">Not found: {itemId}</p>;
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{item.id} — timeline</h2>
      <p className="muted small">{item.title}</p>
      <div className="tl">
        {stops.map((stop, i) => (
          <div className="stop" key={i}>
            <div className="date">{stop.date}</div>
            <div className="dot" style={{ background: stop.color }} />
            <div className="body">
              <h4>{stop.label}</h4>
              <p>{stop.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}