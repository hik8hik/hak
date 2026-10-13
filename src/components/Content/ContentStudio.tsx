"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import type { ContentCard, ContentPreset } from "@/content/types"
import { CONTENT_PRESETS, applyEdit, presetById } from "@/content/types"
import { CONTENT_THEMES, themeById } from "@/content/contentThemes"
import { CARDS, cardsForSeries, findCard } from "@/content/library"
import { useContentSettings } from "@/context/ContentSettingsContext"
import ContentCanvas, { type ContentCanvasHandle } from "./ContentCanvas"
import ContentLibraryBrowser from "./ContentLibraryBrowser"
import ContentEditor from "./ContentEditor"
import ContentExports from "./ContentExports"
import { inheritThemeVars } from "@/lib/export"

export default function ContentStudio() {
  const { s, set, setEdit, resetEdit } = useContentSettings()
  const [activeId, setActiveId] = useState<string | null>(CARDS[0]?.id ?? null)
  const [seriesMode, setSeriesMode] = useState<"single" | "series">("single")
  const [busy, setBusy] = useState(false)
  const previewRef = useRef<ContentCanvasHandle>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const preset = presetById(s.presetId)
  const theme = themeById(s.themeId)

  const activeCard = useMemo(() => {
    if (!activeId) return CARDS[0]
    return findCard(activeId) || CARDS[0]
  }, [activeId])

  const editedActive: ContentCard = useMemo(() => {
    return applyEdit(activeCard, s.edits[activeCard.id])
  }, [activeCard, s.edits])

  const seriesCards: ContentCard[] = useMemo(() => {
    if (!activeCard) return []
    const base = cardsForSeries(activeCard.series)
    return base.map((c) => applyEdit(c, s.edits[c.id]))
  }, [activeCard, s.edits])

  const exportCards = seriesMode === "series" ? seriesCards : [editedActive]

  // Responsive preview: scale the card to fit the preview pane.
  const [previewScale, setPreviewScale] = useState(1)
  useEffect(() => {
    const el = previewRef.current?.getNode()
    const parent = el?.parentElement
    if (!parent) return
    const compute = () => {
      const r = parent.getBoundingClientRect()
      const sx = r.width / preset.w
      const sy = r.height / preset.h
      setPreviewScale(Math.max(0.05, Math.min(sx, sy)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [preset.w, preset.h])

  // Render a card into an off-screen node at the exact target size.
  // Used by exports.
  function renderCard(card: ContentCard, W: number, H: number): HTMLElement | null {
    const host = document.createElement("div")
    host.style.cssText = "position:fixed;top:0;left:-200vw;pointer-events:none;overflow:hidden;"
    host.style.width = W + "px"
    host.style.height = H + "px"
    inheritThemeVars(host)
    const inner = renderCardTree(card, theme, W, H, s.watermark, s.watermarkText)
    host.appendChild(inner)
    document.body.appendChild(host)
    // Detach on next microtask so rasteriseCloned can grab the tree.
    setTimeout(() => { if (host.parentNode) host.parentNode.removeChild(host) }, 30000)
    return inner
  }

  return (
    <div className="content-studio">
      <section className="content-lib-pane raised">
        <ContentLibraryBrowser
          activeId={activeId}
          onPick={(id) => setActiveId(id || null)}
        />
      </section>

      <section className="content-work-pane">
        <div className="pane raised" style={{ padding: 14 }}>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <strong>Canvas</strong>
            <div className="seg">
              <button data-active={seriesMode === "single"} onClick={() => setSeriesMode("single")}>Single card</button>
              <button data-active={seriesMode === "series"} onClick={() => setSeriesMode("series")}>Whole series</button>
            </div>
            <div className="spacer" />
            <select value={s.presetId} onChange={(e) => set("presetId", e.target.value)}>
              {CONTENT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label} — {p.aspect}</option>
              ))}
            </select>
          </div>

          <div className="content-theme-row">
            {CONTENT_THEMES.map((t) => (
              <button
                key={t.id}
                className="content-theme-swatch"
                data-active={s.themeId === t.id}
                title={t.label}
                onClick={() => set("themeId", t.id)}
                style={{ background: t.bg, color: t.fg, borderColor: s.themeId === t.id ? t.accent : "transparent" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="content-preview-frame">
            <div style={{ width: preset.w * previewScale, height: preset.h * previewScale, position: "relative" }}>
              <div
                style={{
                  position: "absolute", top: 0, left: 0,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: preset.w, height: preset.h,
                }}
              >
                <ContentCanvas
                  ref={previewRef}
                  card={editedActive}
                  theme={theme}
                  W={preset.w}
                  H={preset.h}
                  watermark={s.watermark ? s.watermarkText : undefined}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pane raised" style={{ padding: 14 }}>
          <div className="row">
            <strong>Edit</strong>
            <div className="spacer" />
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={s.watermark} onChange={(e) => set("watermark", e.target.checked)} />
              <span className="small">Watermark</span>
            </label>
            {s.watermark && (
              <input
                type="text"
                value={s.watermarkText}
                onChange={(e) => set("watermarkText", e.target.value)}
                style={{ width: 120 }}
                className="inset-sm"
              />
            )}
          </div>
          <ContentEditor
            card={activeCard}
            edit={s.edits[activeCard.id]}
            onEdit={(patch) => setEdit(activeCard.id, patch)}
            onReset={() => resetEdit(activeCard.id)}
          />
        </div>

        <div className="pane raised" style={{ padding: 14 }}>
          <div className="row">
            <strong>Export</strong>
            <div className="spacer" />
            <span className="small muted">{preset.w * preset.pr} × {preset.h * preset.pr}</span>
          </div>
          <ContentExports
            cards={exportCards}
            theme={theme}
            activeCardId={editedActive.id}
            isSeries={seriesMode === "series"}
            preset={preset}
            watermark={s.watermark}
            watermarkText={s.watermarkText}
            renderCard={(card, W, H) => renderCard(card, W, H)}
            onBusy={setBusy}
          />
        </div>
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Imperative HTML-tree renderer for export.
//
// Reuses the same layout code as the React preview by walking the
// React elements. In practice we build a plain <div> tree here with
// identical inline styles, which is what rasteriseCloned expects.
// ────────────────────────────────────────────────────────────
function renderCardTree(
  card: ContentCard,
  theme: ReturnType<typeof themeById>,
  W: number,
  H: number,
  watermark: boolean,
  watermarkText: string,
): HTMLElement {
  // Simplest robust approach: create a React root in a detached div.
  // But we are outside React here; instead use a lightweight DOM tree.
  const R = Math.min(W, H)
  const host = document.createElement("div")
  host.style.width = W + "px"
  host.style.height = H + "px"
  host.style.background = theme.bg
  host.style.color = theme.fg
  host.style.position = "relative"
  host.style.overflow = "hidden"
  host.style.boxSizing = "border-box"

  const pad = R * 0.08
  const stack = document.createElement("div")
  stack.style.cssText = "padding:" + pad + "px;display:flex;flex-direction:column;height:100%;width:100%;box-sizing:border-box;gap:" + R * 0.04 + "px;"

  const hookEl = document.createElement("div")
  hookEl.textContent = card.hook
  hookEl.style.cssText = "font-family:" + theme.fontDisplay + ";font-weight:800;font-size:" + R * 0.06 + "px;line-height:1.12;letter-spacing:-0.01em;color:" + theme.fg + ";"
  stack.appendChild(hookEl)

  const bodyEl = document.createElement("div")
  bodyEl.style.cssText = "flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;gap:" + R * 0.025 + "px;"
  for (const line of card.body) {
    const l = document.createElement("div")
    l.textContent = line
    l.style.cssText = "font-family:" + theme.fontBody + ";font-size:" + R * 0.030 + "px;line-height:1.45;color:" + theme.fg + ";"
    bodyEl.appendChild(l)
  }
  stack.appendChild(bodyEl)

  if (card.verdict) {
    const v = document.createElement("div")
    v.textContent = card.verdict
    v.style.cssText = "border-top:2px solid " + theme.rule + ";padding-top:" + R * 0.03 + "px;font-family:" + theme.fontBody + ";font-weight:700;font-size:" + R * 0.030 + "px;line-height:1.3;color:" + theme.accent + ";"
    stack.appendChild(v)
  }

  if (card.signoff) {
    const s2 = document.createElement("div")
    s2.textContent = card.signoff
    s2.style.cssText = "font-family:" + theme.fontBody + ";font-size:" + R * 0.023 + "px;color:" + theme.fgDim + ";"
    stack.appendChild(s2)
  }

  host.appendChild(stack)

  if (watermark && watermarkText) {
    const wm = document.createElement("div")
    wm.textContent = watermarkText
    wm.style.cssText = "position:absolute;right:" + R * 0.05 + "px;bottom:" + R * 0.04 + "px;font-family:" + theme.fontBody + ";font-size:" + R * 0.018 + "px;color:" + theme.fgDim + ";letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;"
    host.appendChild(wm)
  }

  return host
}