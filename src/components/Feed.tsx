"use client";
import { useEffect, useState } from "react";
import type { ThreatItem } from "@/lib/types";
import ThreatCard from "./ThreatCard";
export default function Feed({ source = "cve" }: { source?: "cve" | "kev" | "attack" | "cwe" }) {
  const [items, setItems] = useState<ThreatItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setItems(null);
    fetch(`/api/feed?source=${source}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(Array.isArray(d) ? d : d.items ?? []); })
      .catch((e) => { if (!cancelled) setErr(String(e)); });
    return () => { cancelled = true; };
  }, [source]);
  if (err) return <p className="muted">Failed to load feed: {err}</p>;
  if (!items) return <p className="muted">Loading feed…</p>;
  if (!items.length) return <p className="muted">No items.</p>;
  return <div className="feed">{items.map((it, i) => <ThreatCard key={it.id + i} item={it} exportable />)}</div>;
}
