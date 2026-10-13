"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThreatItem } from "@/lib/types";

const Ctx = createContext<{
  items: ThreatItem[];
  has: (id: string) => boolean;
  toggle: (it: ThreatItem) => void;
  remove: (id: string) => void;
  clear: () => void;
} | null>(null);
const LS_KEY = "hak.queue";

export function QueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ThreatItem[]>([]);
  useEffect(() => {
    try { const r = localStorage.getItem(LS_KEY); if (r) setItems(JSON.parse(r)); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {} }, [items]);
  const has = useCallback((id: string) => items.some((x) => x.id === id), [items]);
  const toggle = useCallback((it: ThreatItem) => {
    setItems((prev) => prev.some((x) => x.id === it.id) ? prev.filter((x) => x.id !== it.id) : [...prev, it]);
  }, []);
  const remove = useCallback((id: string) => setItems((p) => p.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  return <Ctx.Provider value={{ items, has, toggle, remove, clear }}>{children}</Ctx.Provider>;
}
export function useQueue() {
  const c = useContext(Ctx); if (!c) throw new Error("useQueue outside provider"); return c;
}
