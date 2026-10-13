"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { ContentEdits, ContentEdit } from "@/content/types";

export interface ContentSettings {
  presetId: string;         // current aspect preset
  themeId: string;          // current theme
  watermark: boolean;
  watermarkText: string;
  edits: ContentEdits;      // per-card overrides, keyed by card id
}

const DEFAULTS: ContentSettings = {
  presetId: "story-4k",
  themeId: "paper",
  watermark: false,
  watermarkText: "hak",
  edits: {},
}

interface Ctx {
  s: ContentSettings;
  set: <K extends keyof ContentSettings>(k: K, v: ContentSettings[K]) => void;
  setEdit: (cardId: string, patch: ContentEdit) => void;
  resetEdit: (cardId: string) => void;
  reset: () => void;
}

const ContentSettingsCtx = createContext<Ctx | null>(null)
const LS_KEY = "hak.content"

export function ContentSettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<ContentSettings>(DEFAULTS)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {}
  }, [s])
  const set = useCallback(<K extends keyof ContentSettings>(k: K, v: ContentSettings[K]) => {
    setS((p) => ({ ...p, [k]: v }))
  }, [])
  const setEdit = useCallback((cardId: string, patch: ContentEdit) => {
    setS((p) => ({ ...p, edits: { ...p.edits, [cardId]: { ...(p.edits[cardId] || {}), ...patch } } }))
  }, [])
  const resetEdit = useCallback((cardId: string) => {
    setS((p) => {
      const next = { ...p.edits }
      delete next[cardId]
      return { ...p, edits: next }
    })
  }, [])
  const reset = useCallback(() => setS(DEFAULTS), [])
  return (
    <ContentSettingsCtx.Provider value={{ s, set, setEdit, resetEdit, reset }}>
      {children}
    </ContentSettingsCtx.Provider>
  )
}

export function useContentSettings() {
  const c = useContext(ContentSettingsCtx)
  if (!c) throw new Error("useContentSettings must be used inside ContentSettingsProvider")
  return c
}