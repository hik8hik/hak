// NOTE: chart findings carry a `chart: ChartSpec` (plain data).
// They are not rendered into this string-based HTML. Instead, when
// a chart card is exported, the export captures the live DOM, which
// already contains the rendered Recharts SVG. Exporting chart cards
// via the string path (rasteriseHtml) will show the card without a
// chart — use the live-DOM path (rasteriseCloned) for chart cards.

import type { ExportPreset } from "@/lib/types";
import type { ScamFinding, ScamSeverity } from "./types";

const UI_FONT = "system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
const MONO_FONT = "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace";

const SEV_COLOR: Record<ScamSeverity, string> = {
  critical: "#DD0008",
  high: "#FF7E1E",
  medium: "#FFC107",
  low: "#4ECB4A",
  info: "#8892a6",
};

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
}

function attr(name: string, value: string | number): string {
  return " " + name + "=\"" + String(value).replace(/"/g, "&quot;") + "\"";
}

function styleAttr(css: string): string {
  return " style=\"" + css.replace(/"/g, "&quot;") + "\"";
}

export function scamFindingHtml(f: ScamFinding, preset: ExportPreset, host: string): string {
  const W = preset.w;
  const H = preset.h;
  const isLandscape = W > H;
  const ref = Math.min(W, H);

  const pad = Math.round(ref * 0.075)
  const idSize = Math.round(ref * 0.020)
  const pillSize = Math.round(ref * 0.017)
  const titleSize = Math.round(ref * (isLandscape ? 0.048 : 0.058))
  const summarySize = Math.round(ref * 0.026)
  const evLabelSize = Math.round(ref * 0.018)
  const evValueSize = Math.round(ref * 0.020)
  const brandSize = Math.round(ref * 0.013)
  const sev = SEV_COLOR[f.severity]
  const maxEvidence = isLandscape ? 6 : (H >= 1900 ? 12 : 8)
  const rows = (f.evidence || []).slice(0, maxEvidence)

  const rootCss = [
    "width:" + W + "px",
    "height:" + H + "px",
    "box-sizing:border-box",
    "padding:" + pad + "px",
    "display:flex",
    "flex-direction:column",
    "background:var(--surface)",
    "color:var(--text)",
    "font-family:" + UI_FONT,
    "overflow:hidden",
    "border-top:8px solid " + sev,
  ].join(";")

  const headerCss = "display:flex;align-items:center;gap:" + Math.round(pad * 0.25) + "px;flex-wrap:wrap;"
  const idCss = "font-family:" + MONO_FONT + ";font-size:" + idSize + "px;letter-spacing:0.04em;color:var(--text-dim);text-transform:uppercase;"
  const kindCss = "padding:" + Math.round(pillSize * 0.35) + "px " + Math.round(pillSize * 0.85) + "px;border-radius:999px;background:var(--surface-2);color:var(--text-dim);font-size:" + pillSize + "px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;"
  const sevCss = "display:inline-flex;align-items:center;gap:6px;padding:" + Math.round(pillSize * 0.35) + "px " + Math.round(pillSize * 0.85) + "px;border-radius:999px;background:" + sev + ";color:#fff;font-size:" + pillSize + "px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;"
  const titleCss = "margin:" + Math.round(pad * 0.35) + "px 0 " + Math.round(pad * 0.20) + "px;font-size:" + titleSize + "px;line-height:1.18;letter-spacing:-0.01em;font-weight:800;"
  const summaryCss = "margin:0 0 " + Math.round(pad * 0.30) + "px;font-size:" + summarySize + "px;line-height:1.45;color:var(--text-dim);"
  const evRowCss = "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:" + Math.round(pad * 0.20) + "px;padding:" + Math.round(pad * 0.12) + "px " + Math.round(pad * 0.18) + "px;border-radius:8px;background:var(--surface-2);margin-bottom:4px;font-size:" + evValueSize + "px;line-height:1.4;"
  const evRowBadCss = evRowCss + "border-left:3px solid " + sev + ";"
  const evLabelCss = "font-size:" + evLabelSize + "px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;font-weight:600;"
  const evValueCss = "font-size:" + evValueSize + "px;word-break:break-word;"
  const footCss = "display:flex;align-items:flex-end;justify-content:space-between;gap:" + Math.round(pad * 0.5) + "px;margin-top:auto;padding-top:" + Math.round(pad * 0.30) + "px;"
  const brandCss = "font-size:" + brandSize + "px;color:var(--text-dim);letter-spacing:0.03em;"
  const hostCss = "font-family:" + MONO_FONT + ";font-size:" + brandSize + "px;color:var(--text-dim);letter-spacing:0.02em;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"

  const evidenceHtml = rows.length
    ? rows.map((r) => {
        const css = r.bad ? evRowBadCss : evRowCss
        return "<div" + styleAttr(css) + ">" +
          "<div" + styleAttr(evLabelCss) + ">" + esc(r.label) + "</div>" +
          "<div" + styleAttr(evValueCss) + ">" + esc(truncate(r.value, 220)) + "</div>" +
        "</div>"
      }).join("")
    : ""

  return "<div" + styleAttr(rootCss) + ">" +
    "<div" + styleAttr(headerCss) + ">" +
      "<span" + styleAttr(idCss) + ">" + esc(f.id) + "</span>" +
      "<span" + styleAttr(kindCss) + ">" + esc(f.kind) + "</span>" +
      "<span" + styleAttr(sevCss) + ">" + esc(f.severity) + "</span>" +
    "</div>" +
    "<h1" + styleAttr(titleCss) + ">" + esc(f.title) + "</h1>" +
    "<p" + styleAttr(summaryCss) + ">" + esc(truncate(f.summary, 420)) + "</p>" +
    evidenceHtml +
    "<div" + styleAttr(footCss) + ">" +
      "<div" + styleAttr(brandCss) + ">hak · scam scanner</div>" +
      "<div" + styleAttr(hostCss) + ">" + esc(host) + "</div>" +
    "</div>" +
  "</div>";
}

// ────────────────────────────────────────────────────────────────────
// Narrative card — long-form executive summary.
// Renders the paragraph as a wrapped block sized to the preset.
// ────────────────────────────────────────────────────────────────────

export function scamNarrativeHtml(
  narrative: string,
  url: string,
  score: number,
  severity: ScamSeverity,
  preset: ExportPreset,
): string {
  const W = preset.w;
  const H = preset.h;
  const isLandscape = W > H;
  const ref = Math.min(W, H);

  const pad = Math.round(ref * 0.075);
  const idSize = Math.round(ref * 0.018);
  const pillSize = Math.round(ref * 0.017);
  const titleSize = Math.round(ref * 0.040);
  const bodySize = Math.round(ref * (isLandscape ? 0.026 : 0.028));
  const brandSize = Math.round(ref * 0.013);

  const sev = SEV_COLOR[severity];
  const bodyText = narrative || "No narrative generated.";
  const maxChars = isLandscape ? 900 : (H >= 1900 ? 1400 : 1000);
  const clipped = bodyText.length > maxChars ? bodyText.slice(0, maxChars - 1) + "\u2026" : bodyText;

  const rootCss = [
    "width:" + W + "px",
    "height:" + H + "px",
    "box-sizing:border-box",
    "padding:" + pad + "px",
    "display:flex",
    "flex-direction:column",
    "background:var(--surface)",
    "color:var(--text)",
    "font-family:" + UI_FONT,
    "overflow:hidden",
    "border-top:12px solid " + sev,
  ].join(";");

  const headerCss = "display:flex;align-items:center;gap:" + Math.round(pad * 0.25) + "px;flex-wrap:wrap;"
  const idCss = "font-family:" + MONO_FONT + ";font-size:" + idSize + "px;letter-spacing:0.04em;color:var(--text-dim);text-transform:uppercase;"
  const sevCss = "padding:" + Math.round(pillSize * 0.35) + "px " + Math.round(pillSize * 0.85) + "px;border-radius:999px;background:" + sev + ";color:#fff;font-size:" + pillSize + "px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;"
  const scoreCss = "padding:" + Math.round(pillSize * 0.35) + "px " + Math.round(pillSize * 0.85) + "px;border-radius:999px;background:var(--surface-2);color:var(--text);font-size:" + pillSize + "px;font-weight:700;letter-spacing:0.05em;"
  const titleCss = "margin:" + Math.round(pad * 0.35) + "px 0 " + Math.round(pad * 0.30) + "px;font-size:" + titleSize + "px;line-height:1.1;font-weight:800;letter-spacing:-0.01em;"
  const bodyCss = "margin:0;font-size:" + bodySize + "px;line-height:1.5;color:var(--text);"
  const footCss = "display:flex;align-items:flex-end;justify-content:space-between;gap:" + Math.round(pad * 0.5) + "px;margin-top:auto;padding-top:" + Math.round(pad * 0.35) + "px;"
  const brandCss = "font-size:" + brandSize + "px;color:var(--text-dim);letter-spacing:0.03em;"
  const hostCss = "font-family:" + MONO_FONT + ";font-size:" + brandSize + "px;color:var(--text-dim);max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"

  return "<div" + styleAttr(rootCss) + ">" +
    "<div" + styleAttr(headerCss) + ">" +
      "<span" + styleAttr(idCss) + ">Executive summary</span>" +
      "<span" + styleAttr(sevCss) + ">" + esc(severity) + "</span>" +
      "<span" + styleAttr(scoreCss) + ">Score " + esc(String(score)) + "/100</span>" +
    "</div>" +
    "<h1" + styleAttr(titleCss) + ">What this domain actually is</h1>" +
    "<p" + styleAttr(bodyCss) + ">" + esc(clipped) + "</p>" +
    "<div" + styleAttr(footCss) + ">" +
      "<div" + styleAttr(brandCss) + ">hak \u00b7 scam scanner</div>" +
      "<div" + styleAttr(hostCss) + ">" + esc(url) + "</div>" +
    "</div>" +
  "</div>";
}


// ────────────────────────────────────────────────────────────────────
// Cover page — the executive summary that leads every export.
//
// Reproduces the top banner from the scanner UI at export resolution:
// large risk score, severity label, verdict line, target URL, narrative
// paragraph, and a preview of the top findings. Designed so the viewer
// sees the whole story on the first card before diving into detail.
// ────────────────────────────────────────────────────────────────────

export interface CoverFinding {
  severity: ScamSeverity;
  title: string;
  summary: string;
}

export function scamCoverHtml(
  url: string,
  hostname: string,
  score: number,
  severity: ScamSeverity,
  verdict: string,
  narrative: string,
  findings: CoverFinding[],
  scannedAt: string,
  preset: ExportPreset,
): string {
  const W = preset.w;
  const H = preset.h;
  const isLandscape = W > H;
  const ref = Math.min(W, H);

  const pad = Math.round(ref * 0.065);
  const brandSize = Math.round(ref * 0.014);
  const scoreSize = Math.round(ref * 0.16);
  const scoreLabelSize = Math.round(ref * 0.016);
  const sevSize = Math.round(ref * 0.030);
  const urlSize = Math.round(ref * 0.020);
  const verdictSize = Math.round(ref * 0.030);
  const narrativeSize = Math.round(ref * 0.022);
  const sectionSize = Math.round(ref * 0.018);
  const findingSevSize = Math.round(ref * 0.014);
  const findingTitleSize = Math.round(ref * 0.020);
  const findingBodySize = Math.round(ref * 0.015);
  const footerSize = Math.round(ref * 0.013);

  const sev = SEV_COLOR[severity];

  // Clip text to what will fit.
  const urlShown = url.length > 64 ? url.slice(0, 63) + "\u2026" : url;
  const verdictBudget = isLandscape ? 140 : 240;
  const verdictShown = verdict.length > verdictBudget ? verdict.slice(0, verdictBudget - 1) + "\u2026" : verdict;
  const narrativeBudget = isLandscape ? 520 : (H >= 1900 ? 900 : 680);
  const narrativeShown = (narrative || "").length > narrativeBudget
    ? (narrative || "").slice(0, narrativeBudget - 1) + "\u2026"
    : (narrative || "");

  // Top findings: sort by severity, take 5.
  const order: Record<ScamSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const top = [...findings].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, isLandscape ? 4 : 5);

  // ─── Root ──────────────────────────────────────────────────────────
  const rootCss = [
    "width:" + W + "px",
    "height:" + H + "px",
    "box-sizing:border-box",
    "padding:" + pad + "px",
    "display:flex",
    "flex-direction:column",
    "background:linear-gradient(160deg,var(--surface) 0%,var(--surface-2) 100%)",
    "color:var(--text)",
    "font-family:" + UI_FONT,
    "overflow:hidden",
    "border-top:" + Math.round(ref * 0.010) + "px solid " + sev,
  ].join(";");

  // ─── Header ────────────────────────────────────────────────────────
  const headerCss = "display:flex;align-items:center;justify-content:space-between;gap:" + Math.round(pad * 0.4) + "px;"
  const brandCss = "font-size:" + brandSize + "px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-dim);font-weight:700;"
  const brandAccentCss = "display:inline-block;width:" + Math.round(ref * 0.014) + "px;height:" + Math.round(ref * 0.014) + "px;border-radius:3px;background:linear-gradient(135deg,var(--cs-high),var(--cs-critical));margin-right:" + Math.round(ref * 0.008) + "px;vertical-align:-1px;"
  const tsCss = "font-size:" + footerSize + "px;color:var(--text-dim);font-family:" + MONO_FONT + ";"

  // ─── Score block ───────────────────────────────────────────────────
  const scoreBlockCss = isLandscape
    ? "display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:" + Math.round(pad * 0.6) + "px;align-items:center;margin-top:" + Math.round(pad * 0.6) + "px;"
    : "display:flex;flex-direction:column;align-items:flex-start;gap:" + Math.round(pad * 0.25) + "px;margin-top:" + Math.round(pad * 0.5) + "px;"

  const scoreRowCss = "display:flex;align-items:baseline;gap:" + Math.round(pad * 0.25) + "px;"
  const scoreNumCss = "font-size:" + scoreSize + "px;font-weight:900;line-height:0.9;letter-spacing:-0.03em;color:" + sev + ";font-family:" + UI_FONT + ";"
  const scoreSlashCss = "font-size:" + sevSize + "px;font-weight:500;color:var(--text-dim);font-family:" + MONO_FONT + ";"
  const scoreLabelCss = "margin-top:" + Math.round(pad * 0.08) + "px;font-size:" + scoreLabelSize + "px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-dim);font-weight:600;"
  const sevPillCss = "display:inline-block;padding:" + Math.round(sevSize * 0.42) + "px " + Math.round(sevSize * 1.0) + "px;border-radius:999px;background:" + sev + ";color:#fff;font-size:" + sevSize + "px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;box-shadow:0 4px 16px " + sev + "40;"

  const verdictTextCss = "margin:" + Math.round(pad * 0.2) + "px 0 0;font-size:" + verdictSize + "px;line-height:1.28;font-weight:600;color:var(--text);letter-spacing:-0.005em;"

  // ─── Target URL strip ──────────────────────────────────────────────
  const urlStripCss = "margin-top:" + Math.round(pad * 0.55) + "px;padding:" + Math.round(pad * 0.35) + "px " + Math.round(pad * 0.5) + "px;border-radius:" + Math.round(ref * 0.014) + "px;background:var(--surface-3);border-left:" + Math.round(ref * 0.005) + "px solid var(--accent);"
  const urlLabelCss = "font-size:" + scoreLabelSize + "px;letter-spacing:0.10em;text-transform:uppercase;color:var(--text-dim);font-weight:600;margin-bottom:" + Math.round(pad * 0.10) + "px;"
  const urlValueCss = "font-family:" + MONO_FONT + ";font-size:" + urlSize + "px;color:var(--text);word-break:break-all;line-height:1.35;font-weight:500;"

  // ─── Narrative section ─────────────────────────────────────────────
  const sectionLabelCss = "margin-top:" + Math.round(pad * 0.55) + "px;font-size:" + sectionSize + "px;letter-spacing:0.10em;text-transform:uppercase;color:var(--text-dim);font-weight:700;"
  const narrativeCss = "margin:" + Math.round(pad * 0.15) + "px 0 0;font-size:" + narrativeSize + "px;line-height:1.45;color:var(--text);"

  // ─── Findings preview ──────────────────────────────────────────────
  const findingsWrapCss = "margin-top:" + Math.round(pad * 0.45) + "px;display:flex;flex-direction:column;gap:" + Math.round(pad * 0.18) + "px;"
  const findingRowCss = "display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:" + Math.round(pad * 0.28) + "px;padding:" + Math.round(pad * 0.22) + "px " + Math.round(pad * 0.30) + "px;border-radius:" + Math.round(ref * 0.010) + "px;background:var(--surface-3);align-items:start;"
  const findingDotBaseCss = "display:inline-block;padding:" + Math.round(findingSevSize * 0.35) + "px " + Math.round(findingSevSize * 0.75) + "px;border-radius:999px;font-size:" + findingSevSize + "px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#fff;white-space:nowrap;"
  const findingTitleCss = "font-size:" + findingTitleSize + "px;font-weight:700;line-height:1.25;"
  const findingBodyCss = "margin-top:" + Math.round(pad * 0.08) + "px;font-size:" + findingBodySize + "px;line-height:1.35;color:var(--text-dim);"

  // ─── Footer ────────────────────────────────────────────────────────
  const footCss = "display:flex;align-items:flex-end;justify-content:space-between;gap:" + Math.round(pad * 0.5) + "px;margin-top:auto;padding-top:" + Math.round(pad * 0.40) + "px;border-top:1px solid var(--border);"
  const footLeftCss = "font-size:" + footerSize + "px;color:var(--text-dim);letter-spacing:0.03em;"
  const footRightCss = "font-family:" + MONO_FONT + ";font-size:" + footerSize + "px;color:var(--text-dim);text-align:right;max-width:56%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"

  // ─── Assemble ──────────────────────────────────────────────────────
  const headerHtml =
    "<div" + styleAttr(headerCss) + ">" +
      "<div" + styleAttr(brandCss) + ">" +
        "<span" + styleAttr(brandAccentCss) + "></span>hak \u00b7 scam scanner" +
      "</div>" +
      "<div" + styleAttr(tsCss) + ">" + esc(scannedAt) + "</div>" +
    "</div>";

  const scoreBlockHtml = isLandscape
    ? "<div" + styleAttr(scoreBlockCss) + ">" +
        "<div>" +
          "<div" + styleAttr(scoreRowCss) + ">" +
            "<div" + styleAttr(scoreNumCss) + ">" + esc(String(score)) + "</div>" +
            "<div" + styleAttr(scoreSlashCss) + ">/ 100</div>" +
          "</div>" +
          "<div" + styleAttr(scoreLabelCss) + ">Risk score</div>" +
        "</div>" +
        "<div>" +
          "<div" + styleAttr(sevPillCss) + ">" + esc(severity) + "</div>" +
          "<p" + styleAttr(verdictTextCss) + ">" + esc(verdictShown) + "</p>" +
        "</div>" +
      "</div>"
    : "<div" + styleAttr(scoreBlockCss) + ">" +
        "<div>" +
          "<div" + styleAttr(scoreRowCss) + ">" +
            "<div" + styleAttr(scoreNumCss) + ">" + esc(String(score)) + "</div>" +
            "<div" + styleAttr(scoreSlashCss) + ">/ 100</div>" +
          "</div>" +
          "<div" + styleAttr(scoreLabelCss) + ">Risk score</div>" +
        "</div>" +
        "<div" + styleAttr(sevPillCss) + ">" + esc(severity) + "</div>" +
        "<p" + styleAttr(verdictTextCss) + ">" + esc(verdictShown) + "</p>" +
      "</div>";

  const urlStripHtml =
    "<div" + styleAttr(urlStripCss) + ">" +
      "<div" + styleAttr(urlLabelCss) + ">Investigated target</div>" +
      "<div" + styleAttr(urlValueCss) + ">" + esc(urlShown) + "</div>" +
    "</div>";

  const narrativeHtml = narrativeShown
    ? "<div" + styleAttr(sectionLabelCss) + ">What this domain actually is</div>" +
      "<p" + styleAttr(narrativeCss) + ">" + esc(narrativeShown) + "</p>"
    : "";

  const findingsHtml = top.length
    ? "<div" + styleAttr(sectionLabelCss) + ">Key indicators (" + findings.length + " findings total)</div>" +
      "<div" + styleAttr(findingsWrapCss) + ">" +
        top.map((f) => {
          const rowSev = SEV_COLOR[f.severity];
          const dotCss = findingDotBaseCss + "background:" + rowSev + ";";
          return "<div" + styleAttr(findingRowCss) + ">" +
            "<span" + styleAttr(dotCss) + ">" + esc(f.severity) + "</span>" +
            "<div>" +
              "<div" + styleAttr(findingTitleCss) + ">" + esc(f.title) + "</div>" +
              "<div" + styleAttr(findingBodyCss) + ">" + esc(f.summary.length > 140 ? f.summary.slice(0, 139) + "\u2026" : f.summary) + "</div>" +
            "</div>" +
          "</div>";
        }).join("") +
      "</div>"
    : "";

  const footHtml =
    "<div" + styleAttr(footCss) + ">" +
      "<div" + styleAttr(footLeftCss) + ">Generated by hak \u00b7 scam scanner</div>" +
      "<div" + styleAttr(footRightCss) + ">" + esc(hostname) + "</div>" +
    "</div>";

  return "<div" + styleAttr(rootCss) + ">" +
    headerHtml +
    scoreBlockHtml +
    urlStripHtml +
    narrativeHtml +
    findingsHtml +
    footHtml +
  "</div>";
}
