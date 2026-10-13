import type { ThreatItem } from "./types";
export function toMarkdown(it: ThreatItem): string {
  const fm = [
    "---", `id: ${it.id}`, `kind: ${it.kind}`,
    it.severity ? `severity: ${it.severity}` : null,
    it.tactics?.length ? `tactics: [${it.tactics.join(", ")}]` : null,
    "---", "",
  ].filter(Boolean).join("\n");
  const refs = (it.references || []).map((r) => `- <${r}>`).join("\n");
  return [fm, `# ${it.title}`, "", it.summary, "",
    refs ? `## References\n${refs}` : ""].join("\n");
}
