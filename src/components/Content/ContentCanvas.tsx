"use client";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { ContentCard } from "@/content/types";
import type { ContentTheme } from "@/content/contentThemes";
import { ContentLayout } from "@/content/render";

export interface ContentCanvasHandle {
  /** Live DOM node of the card. Used for export rasterisation. */
  getNode: () => HTMLDivElement | null;
}

interface Props {
  card: ContentCard;
  theme: ContentTheme;
  W: number;
  H: number;
  /** Optional watermark text rendered bottom-right. */
  watermark?: string;
  /** When true, the card is rendered for export, not preview. Hides hints. */
  exportMode?: boolean;
}

const ContentCanvas = forwardRef<ContentCanvasHandle, Props>(function ContentCanvas(
  { card, theme, W, H, watermark, exportMode },
  ref,
) {
  const nodeRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => ({ getNode: () => nodeRef.current }), [])
  const R = Math.min(W, H)
  return (
    <div
      ref={nodeRef}
      className="content-canvas"
      style={{
        width: W, height: H,
        background: theme.bg,
        color: theme.fg,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <ContentLayout card={card} theme={theme} W={W} H={H} />
      {watermark && (
        <div style={{
          position: "absolute", right: R * 0.05, bottom: R * 0.04,
          fontFamily: theme.fontBody, fontSize: R * 0.018,
          color: theme.fgDim, letterSpacing: "0.08em", textTransform: "uppercase",
          opacity: 0.7,
        }}>
          {watermark}
        </div>
      )}
    </div>
  )
})

export default ContentCanvas