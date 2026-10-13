"use client";
import React from "react";
import type { ContentCard } from "@/content/types";
import type { ContentTheme } from "@/content/contentThemes";

interface Ctx {
  card: ContentCard;
  theme: ContentTheme;
  W: number;
  H: number;
  R: number; // reference edge = min(W, H)
}

// ────────────────────────────────────────────────────────────
// Layout: HOOK — big statement, one supporting paragraph.
// ────────────────────────────────────────────────────────────
export function RenderHook({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.08;
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ flex: "0 0 auto" }}>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.075, lineHeight: 1.08, letterSpacing: "-0.015em", color: theme.fg }}>
          {card.hook}
        </div>
      </div>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {card.body.map((line, i) => (
          <div key={i} style={{ fontFamily: theme.fontBody, fontSize: R * 0.033, lineHeight: 1.45, color: theme.fgDim, marginBottom: R * 0.02 }}>
            {line}
          </div>
        ))}
      </div>
      {card.verdict && (
        <div style={{ flex: "0 0 auto", borderTop: "2px solid " + theme.rule, paddingTop: R * 0.03 }}>
          <div style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.036, lineHeight: 1.3, color: theme.accent }}>
            {card.verdict}
          </div>
        </div>
      )}
      {card.signoff && (
        <div style={{ flex: "0 0 auto", fontFamily: theme.fontBody, fontSize: R * 0.024, color: theme.fgDim, letterSpacing: "0.02em" }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: STEPS — numbered list, one step per line.
// ────────────────────────────────────────────────────────────
export function RenderSteps({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.08;
  const nSize = R * 0.05;
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.062, lineHeight: 1.1, letterSpacing: "-0.01em", color: theme.fg }}>
        {card.hook}
      </div>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: R * 0.03 }}>
        {card.body.map((line, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: R * 0.025 }}>
            <div style={{
              flex: "0 0 auto", width: nSize, height: nSize, borderRadius: nSize / 2,
              background: theme.accent, color: theme.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: theme.fontBody, fontWeight: 800, fontSize: nSize * 0.5,
              lineHeight: 1,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: "1 1 auto", fontFamily: theme.fontBody, fontSize: R * 0.033, lineHeight: 1.45, color: theme.fg }}>
              {line}
            </div>
          </div>
        ))}
      </div>
      {card.verdict && (
        <div style={{ borderTop: "2px solid " + theme.rule, paddingTop: R * 0.03, fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.032, lineHeight: 1.3, color: theme.accent }}>
          {card.verdict}
        </div>
      )}
      {card.signoff && (
        <div style={{ fontFamily: theme.fontBody, fontSize: R * 0.023, color: theme.fgDim }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: SCRIPT — quote block. For "what to say" cards.
// ────────────────────────────────────────────────────────────
export function RenderScript({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.08;
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.058, lineHeight: 1.12, color: theme.fg }}>
        {card.hook}
      </div>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: R * 0.02, borderLeft: "6px solid " + theme.accent, paddingLeft: R * 0.05 }}>
        {card.body.map((line, i) => (
          <div key={i} style={{ fontFamily: theme.fontMono, fontSize: R * 0.030, lineHeight: 1.5, color: theme.fg }}>
            {line}
          </div>
        ))}
      </div>
      {card.verdict && (
        <div style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.032, lineHeight: 1.3, color: theme.accent }}>
          {card.verdict}
        </div>
      )}
      {card.signoff && (
        <div style={{ fontFamily: theme.fontBody, fontSize: R * 0.023, color: theme.fgDim }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: CHECKLIST — tick boxes. Good for tools / recommendations.
// ────────────────────────────────────────────────────────────
export function RenderChecklist({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.08;
  const boxSize = R * 0.036;
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.058, lineHeight: 1.12, color: theme.fg }}>
        {card.hook}
      </div>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: R * 0.026 }}>
        {card.body.map((line, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: R * 0.022 }}>
            <div style={{
              flex: "0 0 auto", width: boxSize, height: boxSize, borderRadius: boxSize * 0.22,
              border: "3px solid " + theme.accent, marginTop: R * 0.006,
            }} />
            <div style={{ flex: "1 1 auto", fontFamily: theme.fontBody, fontSize: R * 0.030, lineHeight: 1.45, color: theme.fg }}>
              {line}
            </div>
          </div>
        ))}
      </div>
      {card.verdict && (
        <div style={{ borderTop: "2px solid " + theme.rule, paddingTop: R * 0.03, fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.030, lineHeight: 1.3, color: theme.accent }}>
          {card.verdict}
        </div>
      )}
      {card.signoff && (
        <div style={{ fontFamily: theme.fontBody, fontSize: R * 0.023, color: theme.fgDim }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: COMPARE — two columns. First half vs second half of body.
// ────────────────────────────────────────────────────────────
export function RenderCompare({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.07;
  const mid = Math.ceil(card.body.length / 2);
  const left = card.body.slice(0, mid);
  const right = card.body.slice(mid);
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.058, lineHeight: 1.12, color: theme.fg }}>
        {card.hook}
      </div>
      <div style={{ flex: "1 1 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: R * 0.05, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: R * 0.02, borderLeft: "4px solid " + theme.rule, paddingLeft: R * 0.03 }}>
          {left.map((line, i) => (
            <div key={i} style={{ fontFamily: theme.fontBody, fontSize: R * 0.028, lineHeight: 1.4, color: theme.fgDim }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: R * 0.02, borderLeft: "4px solid " + theme.accent, paddingLeft: R * 0.03 }}>
          {right.map((line, i) => (
            <div key={i} style={{ fontFamily: theme.fontBody, fontSize: R * 0.028, lineHeight: 1.4, color: theme.fg }}>
              {line}
            </div>
          ))}
        </div>
      </div>
      {card.verdict && (
        <div style={{ borderTop: "2px solid " + theme.rule, paddingTop: R * 0.03, fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.030, lineHeight: 1.3, color: theme.accent }}>
          {card.verdict}
        </div>
      )}
      {card.signoff && (
        <div style={{ fontFamily: theme.fontBody, fontSize: R * 0.023, color: theme.fgDim }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: VERDICT — big badge, one line. For yes/no decisions.
// ────────────────────────────────────────────────────────────
export function RenderVerdict({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.08;
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.06, lineHeight: 1.12, color: theme.fg }}>
        {card.hook}
      </div>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: R * 0.025 }}>
        {card.body.map((line, i) => (
          <div key={i} style={{ fontFamily: theme.fontBody, fontSize: R * 0.030, lineHeight: 1.45, color: theme.fgDim }}>
            {line}
          </div>
        ))}
      </div>
      {card.verdict && (
        <div style={{
          flex: "0 0 auto", padding: R * 0.03 + " " + R * 0.04,
          borderRadius: R * 0.03, background: theme.accent, color: theme.bg,
          fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.044,
          lineHeight: 1.15, textAlign: "center",
        }}>
          {card.verdict}
        </div>
      )}
      {card.signoff && (
        <div style={{ fontFamily: theme.fontBody, fontSize: R * 0.023, color: theme.fgDim }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: REDFLAGS — bullets, marker is a red square. For warnings.
// ────────────────────────────────────────────────────────────
export function RenderRedFlags({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.08;
  const dot = R * 0.026;
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.04 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.06, lineHeight: 1.12, color: theme.fg }}>
        {card.hook}
      </div>
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: R * 0.026 }}>
        {card.body.map((line, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: R * 0.022 }}>
            <div style={{
              flex: "0 0 auto", width: dot, height: dot, borderRadius: dot * 0.22,
              background: "#DD0008", marginTop: R * 0.014,
            }} />
            <div style={{ flex: "1 1 auto", fontFamily: theme.fontBody, fontSize: R * 0.030, lineHeight: 1.45, color: theme.fg }}>
              {line}
            </div>
          </div>
        ))}
      </div>
      {card.verdict && (
        <div style={{ borderTop: "2px solid " + theme.rule, paddingTop: R * 0.03, fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.030, lineHeight: 1.3, color: theme.accent }}>
          {card.verdict}
        </div>
      )}
      {card.signoff && (
        <div style={{ fontFamily: theme.fontBody, fontSize: R * 0.023, color: theme.fgDim }}>
          {card.signoff}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Layout: TWOCARD — two panels, top and bottom. "Real vs fake".
// ────────────────────────────────────────────────────────────
export function RenderTwoCard({ card, theme, W, H, R }: Ctx) {
  const pad = R * 0.07;
  const mid = Math.ceil(card.body.length / 2);
  const top = card.body.slice(0, mid)
  const bot = card.body.slice(mid)
  const panel = (title: string, lines: string[], danger: boolean) => (
    <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: R * 0.02, padding: R * 0.04, borderRadius: R * 0.025, background: danger ? "rgba(221,0,8,0.10)" : "rgba(78,203,74,0.10)", border: "2px solid " + (danger ? "rgba(221,0,8,0.30)" : "rgba(78,203,74,0.30)") }}>
      <div style={{ fontFamily: theme.fontBody, fontWeight: 800, fontSize: R * 0.026, letterSpacing: "0.06em", textTransform: "uppercase", color: danger ? "#DD0008" : "#2f8b2b" }}>{title}</div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: theme.fontBody, fontSize: R * 0.028, lineHeight: 1.4, color: theme.fg }}>{l}</div>
      ))}
    </div>
  )
  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box", gap: R * 0.03 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: R * 0.052, lineHeight: 1.12, color: theme.fg }}>
        {card.hook}
      </div>
      {panel("Before", top, true)}
      {panel("After", bot, false)}
      {card.verdict && (
        <div style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: R * 0.028, lineHeight: 1.3, color: theme.accent }}>
          {card.verdict}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Dispatcher
// ────────────────────────────────────────────────────────────
export function ContentLayout({ card, theme, W, H }: { card: ContentCard; theme: ContentTheme; W: number; H: number }) {
  const R = Math.min(W, H)
  const props = { card, theme, W, H, R }
  switch (card.layout) {
    case "hook":      return <RenderHook {...props} />
    case "steps":     return <RenderSteps {...props} />
    case "script":    return <RenderScript {...props} />
    case "checklist": return <RenderChecklist {...props} />
    case "compare":   return <RenderCompare {...props} />
    case "verdict":   return <RenderVerdict {...props} />
    case "redflags":  return <RenderRedFlags {...props} />
    case "twocard":   return <RenderTwoCard {...props} />
    default:          return <RenderHook {...props} />
  }
}