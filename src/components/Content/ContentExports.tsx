"use client"
import { useState } from "react"
import JSZip from "jszip"
import type { ContentCard, ContentPreset } from "@/content/types"
import { CONTENT_PRESETS, presetById } from "@/content/types"
import type { ContentTheme } from "@/content/contentThemes"
import { rasteriseCloned, download } from "@/lib/export"
import { animationSupported, recordAnimation, downloadBlob } from "@/lib/animate"

interface Props {
  cards: ContentCard[]
  theme: ContentTheme
  activeCardId: string | null
  /** When true, the export is a single card; when false, series-wide. */
  isSeries: boolean
  preset: ContentPreset
  watermark: boolean
  watermarkText: string
  /** Renderer: returns a live DOM node for a card at target size. */
  renderCard: (card: ContentCard, W: number, H: number) => HTMLElement | null
  /** Called before/after export to lock the UI. */
  onBusy: (busy: boolean) => void
}

export default function ContentExports({
  cards, theme, activeCardId, isSeries, preset, watermark, watermarkText, renderCard, onBusy,
}: Props) {
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function exportSinglePng() {
    const card = activeCardId ? cards.find((c) => c.id === activeCardId) : cards[0]
    if (!card) return
    setBusy(true); onBusy(true); setProgress(0)
    try {
      const node = renderCard(card, preset.w, preset.h)
      if (!node) throw new Error("renderCard returned null")
      const url = await rasteriseCloned(node, {
        width: preset.w,
        height: preset.h,
        pixelRatio: preset.pr,
        background: null,
      })
      download(url, "hak-content-" + card.id + "-" + preset.id + ".png")
      setNotice("Exported " + card.id)
    } catch (e) {
      console.error("[hak] content PNG failed", e)
      setNotice("Export failed: " + String(e))
    } finally {
      setBusy(false); onBusy(false)
    }
  }

  async function exportSeriesPng() {
    if (cards.length === 0) return
    setBusy(true); onBusy(true); setProgress(0)
    const zip = new JSZip()
    try {
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i]
        const node = renderCard(c, preset.w, preset.h)
        if (!node) { setProgress((i + 1) / cards.length); continue }
        const url = await rasteriseCloned(node, {
          width: preset.w,
          height: preset.h,
          pixelRatio: preset.pr,
          background: null,
        })
        zip.file(String(i + 1).padStart(2, "0") + "-" + c.id + ".png", url.split(",")[1], { base64: true })
        setProgress((i + 1) / cards.length)
      }
      const blob = await zip.generateAsync({ type: "blob" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "hak-content-series-" + preset.id + ".zip"
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 3000)
      setNotice("Exported " + cards.length + " cards")
    } catch (e) {
      console.error("[hak] series PNG failed", e)
      setNotice("Series export failed: " + String(e))
    } finally {
      setBusy(false); onBusy(false)
    }
  }

  async function exportSeriesText() {
    const txt = cards.map((c, i) => {
      const body = c.body.map((l) => "  " + l).join("\n")
      return [
        "### " + String(i + 1).padStart(2, "0") + " — " + c.hook,
        body,
        c.verdict ? "  → " + c.verdict : "",
        c.signoff ? "  " + c.signoff : "",
        "",
      ].filter(Boolean).join("\n")
    }).join("\n")
    const blob = new Blob([txt], { type: "text/markdown" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "hak-content-series.md"
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 3000)
  }

  async function exportSeriesVideo() {
    if (!animationSupported()) {
      setNotice("Video export needs Chrome, Edge, Brave or Firefox.")
      return
    }
    if (cards.length === 0) return
    setBusy(true); onBusy(true); setProgress(0)
    try {
      const FPS = 30
      const HOLD_FRAMES = Math.round(FPS * 2.4)  // 2.4s per card
      const totalFrames = cards.length * HOLD_FRAMES
      let idx = 0
      const frameBuilder = (i: number, N: number) => {
        const cardIdx = Math.min(cards.length - 1, Math.floor(i / HOLD_FRAMES))
        idx = cardIdx
        const c = cards[cardIdx]
        const node = renderCard(c, preset.w, preset.h)
        if (node) {
          return node
        }
        // Fallback: empty node so the recorder does not crash.
        const el = document.createElement("div")
        el.style.width = preset.w + "px"
        el.style.height = preset.h + "px"
        el.style.background = theme.bg
        return el
      }
      const blob = await recordAnimation(frameBuilder, {
        width: preset.w,
        height: preset.h,
        pixelRatio: 1,
        fps: FPS,
        frameCount: totalFrames,
        bg: null,
        onProgress: (_phase, p) => setProgress(p),
      })
      downloadBlob(blob, "hak-content-series-" + preset.id + ".webm")
      setNotice("Series video exported.")
    } catch (e) {
      console.error("[hak] series video failed", e)
      setNotice("Video export failed: " + String(e))
    } finally {
      setBusy(false); onBusy(false)
    }
  }

  const single = !isSeries

  return (
    <div className="content-exports">
      <div className="tabs">
        <button className="btn" onClick={exportSinglePng} disabled={busy || cards.length === 0}>
          {single ? "Export this card (PNG)" : "Export first card (PNG)"}
        </button>
        {!single && (
          <>
            <button className="btn" onClick={exportSeriesPng} disabled={busy}>
              Export series ZIP ({cards.length})
            </button>
            <button className="btn" onClick={exportSeriesText} disabled={busy}>
              Copy series as Markdown
            </button>
            <button className="btn" onClick={exportSeriesVideo} disabled={busy}>
              Series video (WebM)
            </button>
          </>
        )}
      </div>
      {busy && (
        <div className="pane pressed" style={{ padding: "6px 10px", marginTop: 6 }}>
          <div className="small muted">Working… {Math.round(progress * 100)}%</div>
        </div>
      )}
      {notice && <p className="small muted" style={{ marginTop: 6 }}>{notice}</p>}
    </div>
  )
}