// Themes tuned for reading, not for terminals.
//
// Each theme defines a background, a text colour, an accent colour,
// and a font stack. The layout components consume the tokens; the
// user picks a theme once.

export interface ContentTheme {
  id: string;
  label: string;
  bg: string;          // solid or gradient (CSS)
  fg: string;          // primary text
  fgDim: string;       // secondary text
  accent: string;      // badges, numbers, highlighter
  rule: string;        // dividers
  fontBody: string;    // long-form reading font
  fontDisplay: string; // hook font
  fontMono: string;    // for scripts
}

const SANS = 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace';

export const CONTENT_THEMES: ContentTheme[] = [
  {
    id: "paper", label: "Paper",
    bg: "#f5efe2", fg: "#1b1814", fgDim: "#5a5346", accent: "#c25a1f",
    rule: "rgba(27,24,20,0.12)", fontBody: SANS, fontDisplay: SERIF, fontMono: MONO,
  },
  {
    id: "ink", label: "Ink",
    bg: "#ffffff", fg: "#0f1115", fgDim: "#5a6478", accent: "#0057ff",
    rule: "rgba(15,17,21,0.10)", fontBody: SANS, fontDisplay: SANS, fontMono: MONO,
  },
  {
    id: "midnight", label: "Midnight",
    bg: "linear-gradient(160deg,#0e1424 0%,#131b32 100%)",
    fg: "#eef2f9", fgDim: "#9aa4bd", accent: "#7BA5FF",
    rule: "rgba(238,242,249,0.10)", fontBody: SANS, fontDisplay: SANS, fontMono: MONO,
  },
  {
    id: "sunset", label: "Sunset",
    bg: "linear-gradient(160deg,#ffd9a0 0%,#ff9a76 55%,#c14953 100%)",
    fg: "#2a0f10", fgDim: "rgba(42,15,16,0.68)", accent: "#5a1030",
    rule: "rgba(42,15,16,0.20)", fontBody: SANS, fontDisplay: SANS, fontMono: MONO,
  },
  {
    id: "forest", label: "Forest",
    bg: "linear-gradient(160deg,#0c1c14 0%,#12261b 100%)",
    fg: "#e8f1e6", fgDim: "#95ab97", accent: "#7ad39a",
    rule: "rgba(232,241,230,0.10)", fontBody: SANS, fontDisplay: SERIF, fontMono: MONO,
  },
  {
    id: "terminal", label: "Terminal",
    bg: "#000000", fg: "#00ff41", fgDim: "#0a8a26", accent: "#00ff41",
    rule: "rgba(0,255,65,0.22)", fontBody: MONO, fontDisplay: MONO, fontMono: MONO,
  },
  {
    id: "rose", label: "Rose",
    bg: "linear-gradient(160deg,#ffe3ec 0%,#ffc4d6 100%)",
    fg: "#3a0e22", fgDim: "rgba(58,14,34,0.65)", accent: "#a01050",
    rule: "rgba(58,14,34,0.18)", fontBody: SANS, fontDisplay: SERIF, fontMono: MONO,
  },
  {
    id: "slate", label: "Slate",
    bg: "#1c1f24", fg: "#f4f6f9", fgDim: "#a0a8b4", accent: "#ffb547",
    rule: "rgba(244,246,249,0.10)", fontBody: SANS, fontDisplay: SANS, fontMono: MONO,
  },
];

export function themeById(id: string): ContentTheme {
  return CONTENT_THEMES.find((t) => t.id === id) || CONTENT_THEMES[0];
}