"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "black" | "auto";
export type ViewMode = "scroll" | "page" | "sheet";

export interface Settings {
  theme: Theme; viewMode: ViewMode;
  smoothScroll: boolean; pageAnimation: boolean;
  fontSize: number; lineHeight: number; fontFamily: string; fontWeight: number;
  showCategoryColors: boolean; showLabels: boolean;
  strokeEnabled: boolean; strokeWidth: number; strokeColor: string;
  soundOn: boolean; watermark: boolean; watermarkText: string; accentColor: string;
}
const DEFAULTS: Settings = {
  theme: "auto", viewMode: "scroll",
  smoothScroll: true, pageAnimation: true,
  fontSize: 15, lineHeight: 1.6, fontFamily: "system-ui", fontWeight: 400,
  showCategoryColors: true, showLabels: true,
  strokeEnabled: false, strokeWidth: 1, strokeColor: "#000000",
  soundOn: true, watermark: false, watermarkText: "hak", accentColor: "#537FFF",
};
const Ctx = createContext<{
  s: Settings;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
} | null>(null);
const LS_KEY = "hak.settings";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try { const r = localStorage.getItem(LS_KEY); if (r) setS({ ...DEFAULTS, ...JSON.parse(r) }); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
    document.cookie = `hak_view=${s.viewMode}; path=/; max-age=31536000; samesite=lax`;
    applyTheme(s.theme);
  }, [s]);
  useEffect(() => {
    if (s.theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("auto");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [s.theme]);
  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v })), []);
  const reset = useCallback(() => setS(DEFAULTS), []);
  return <Ctx.Provider value={{ s, set, reset }}>{children}</Ctx.Provider>;
}
function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const r = t === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
  document.documentElement.dataset.theme = r;
}
export function useSettings() {
  const c = useContext(Ctx); if (!c) throw new Error("useSettings outside provider"); return c;
}
