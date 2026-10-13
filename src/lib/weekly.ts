import type { ThreatItem } from "./types";

export type WeeklyTemplate = "terminal" | "runbook" | "chain" | "markdown" | "csv";

export const TEMPLATES: { id: WeeklyTemplate; label: string; mode: string; ext: string }[] = [
  { id: "terminal", label: "Terminal script", mode: "terminal", ext: "txt" },
  { id: "runbook",  label: "Runbook steps",   mode: "runbook",  ext: "txt" },
  { id: "chain",    label: "Chain of vendors", mode: "chain",   ext: "txt" },
  { id: "markdown", label: "Markdown newsletter", mode: "terminal", ext: "md" },
  { id: "csv",      label: "CSV tracker",     mode: "terminal", ext: "csv" },
];

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
}

export function terminalTemplate(items: ThreatItem[], days: number): string {
  const lines: string[] = [];
  lines.push("$ hak weekly kev --last " + days + "d");
  lines.push("scanning CISA KEV ...");
  lines.push("found " + items.length + " new entries");
  lines.push("");
  for (const it of items.slice(0, 20)) {
    lines.push("[+] " + it.id + "  " + truncate(it.title, 58));
  }
  if (items.length > 20) lines.push("    ... " + (items.length - 20) + " more");
  lines.push("");
  lines.push("$ hak kev --notify all --due 14d");
  lines.push("done.");
  return lines.join("\n");
}

export function runbookTemplate(items: ThreatItem[], days: number): string {
  const top = items.slice(0, 4).map((x) => x.id).join(", ") || "none";
  return [
    "Scope: weekly KEV triage (" + days + "d window, " + items.length + " entries)",
    "Pull: /weekly — source CISA KEV, cached 24h",
    "Identify: " + top,
    "Match: cross-ref against asset inventory",
    "Patch: apply vendor advisory within 14 days (BOD 22-01)",
    "Verify: rescan with authenticated checks",
    "Report: update tracking ticket, close when clean",
  ].join("\n");
}

export function chainTemplate(items: ThreatItem[]): string {
  const products = items.slice(0, 8).map((it) => {
    const m = it.title.split(" — ")[0] || it.title;
    return m.length > 30 ? m.slice(0, 28) + "…" : m;
  });
  return products.join("\n");
}

export function markdownTemplate(items: ThreatItem[], days: number): string {
  const header =
    "# This week in KEV\n\n" +
    "Window: last " + days + " days.  \n" +
    "New entries: **" + items.length + "**.\n";
  const body = items.map((it) => {
    const refs = (it.references || []).map((r) => "- <" + r + ">").join("\n");
    return "## " + it.id + "\n\n**" + it.title + "**\n\n" + it.summary + "\n\n" + (refs || "");
  }).join("\n\n---\n\n");
  return header + "\n" + body;
}

export function csvTemplate(items: ThreatItem[]): string {
  const rows: string[][] = [["cveID", "title", "summary", "reference"]];
  for (const it of items) {
    rows.push([
      it.id,
      it.title,
      it.summary,
      (it.references && it.references[0]) || "",
    ]);
  }
  return rows
    .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))
    .join("\n");
}

export function buildWeeklyPayload(
  template: WeeklyTemplate,
  items: ThreatItem[],
  days: number,
): string {
  if (template === "terminal") return terminalTemplate(items, days);
  if (template === "runbook")  return runbookTemplate(items, days);
  if (template === "chain")    return chainTemplate(items);
  if (template === "csv")      return csvTemplate(items);
  return markdownTemplate(items, days);
}

export function templateMeta(id: WeeklyTemplate) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}