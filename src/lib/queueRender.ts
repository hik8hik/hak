import type { ThreatItem, ExportPreset } from "./types";
import { severityVar, tacticVar } from "./colors";

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] as string));
}

const UI_FONT = "system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
const MONO_FONT = "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace";

/**
 * Build the standalone HTML for one queue card at a given preset.
 * All sizing derives from the preset so 9:16, 1:1 and 16:9 all look
 * intentional rather than stretched.
 *
 * Uses CSS custom properties (--surface, --text, --accent, --cs-*) so
 * the export inherits the active theme automatically.
 */
export function buildQueueHtml(it: ThreatItem, preset: ExportPreset): string {
  const W = preset.w;
  const H = preset.h;
  const isLandscape = W > H;
  const ref = Math.min(W, H);            // reference edge for type scale

  // Type scale: fractions of the reference edge.
  const pad         = Math.round(ref * 0.075);
  const idSize      = Math.round(ref * 0.022);
  const pillSize    = Math.round(ref * 0.018);
  const titleSize   = Math.round(ref * (isLandscape ? 0.052 : 0.062));
  const summarySize = Math.round(ref * 0.028);
  const tacticSize  = Math.round(ref * 0.016);
  const brandSize   = Math.round(ref * 0.014);

  const sev = severityVar(it.severity);
  const tactics = (it.tactics || []).map(
    (t) => `<span style="display:inline-block;padding:${Math.round(pillSize * 0.45)}px ${Math.round(pillSize * 0.9)}px;border-radius:999px;font-size:${tacticSize}px;font-weight:600;letter-spacing:0.02em;margin:2px 4px 2px 0;background:var(--surface-2);color:${tacticVar(t)}">${esc(t)}</span>`
  ).join("");

  // Summary clipped to a length that fits the card.
  const summaryBudget = isLandscape ? 260 : (H >= 1900 ? 520 : 380);
  const summary = it.summary.length > summaryBudget
    ? it.summary.slice(0, summaryBudget).replace(/\s+\S*$/, "") + "…"
    : it.summary;

  const styleOuter = "width:" + W + "px;height:" + H + "px;box-sizing:border-box;padding:" + pad + "px;display:flex;flex-direction:column;background:var(--surface);color:var(--text);font-family:" + UI_FONT + ";overflow:hidden;";
  const styleRow = "display:flex;align-items:center;gap:" + Math.round(pad * 0.3) + "px;flex-wrap:wrap;";
  const styleId = "font-family:" + MONO_FONT + ";font-size:" + idSize + "px;letter-spacing:0.04em;color:var(--text-dim);";
  const styleSevPill = "display:inline-flex;align-items:center;gap:6px;padding:" + Math.round(pillSize * 0.35) + "px " + Math.round(pillSize * 0.85) + "px;border-radius:999px;background:" + sev + ";color:#fff;font-size:" + pillSize + "px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;";
  const styleKindPill = "padding:" + Math.round(pillSize * 0.35) + "px " + Math.round(pillSize * 0.85) + "px;border-radius:999px;background:var(--surface-2);color:var(--text-dim);font-size:" + pillSize + "px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;";
  const styleH1 = "margin:" + Math.round(pad * 0.35) + "px 0 " + Math.round(pad * 0.25) + "px;font-size:" + titleSize + "px;line-height:1.15;letter-spacing:-0.01em;font-weight:800;";
  const styleP = "margin:0;font-size:" + summarySize + "px;line-height:1.5;color:var(--text-dim);";
  const styleTactics = "margin-top:" + Math.round(pad * 0.35) + "px;";
  const styleBrand = "font-size:" + brandSize + "px;color:var(--text-dim);letter-spacing:0.03em;";
  const markSize = Math.round(ref * 0.045);
  const styleMark = "width:" + markSize + "px;height:" + markSize + "px;border-radius:" + Math.round(ref * 0.012) + "px;background:linear-gradient(135deg,var(--cs-high),var(--cs-critical));";
  const styleFoot = "display:flex;align-items:flex-end;justify-content:space-between;gap:" + Math.round(pad * 0.5) + "px;";

  const q = String.fromCharCode(34);   // literal double quote
  const attr = (s: string) => " style=" + q + s + q;

  return "<div" + attr(styleOuter) + ">" +
    "<div" + attr(styleRow) + ">" +
      "<span" + attr(styleId) + ">" + esc(it.id) + "</span>" +
      "<span" + attr(styleSevPill) + ">" + esc(it.severity || "none") + "</span>" +
      "<span" + attr(styleKindPill) + ">" + esc(it.kind) + "</span>" +
    "</div>" +
    "<h1" + attr(styleH1) + ">" + esc(it.title) + "</h1>" +
    "<p" + attr(styleP) + ">" + esc(summary) + "</p>" +
    (tactics ? "<div" + attr(styleTactics) + ">" + tactics + "</div>" : "") +
    "<div" + attr("flex:1;") + "></div>" +
    "<div" + attr(styleFoot) + ">" +
      "<div" + attr(styleBrand) + ">hak · cyber reader</div>" +
      "<div" + attr(styleMark) + "></div>" +
    "</div>" +
  "</div>";
}