import type { ThreatItem } from "./types";
export function flashcardsCsv(items: ThreatItem[]): string {
  const rows = [["Front", "Back", "Tags"]];
  for (const it of items) {
    const front = it.id;
    const back = `${it.title} — ${it.summary.slice(0, 240)}`.replace(/"/g, "'");
    const tags = (it.tactics || [it.kind]).join(" ");
    rows.push([front, back, tags]);
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
