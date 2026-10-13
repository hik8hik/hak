export interface Slide { kind: "hook" | "body" | "cta"; text: string; }
export function carouselSlides(payload: string): Slide[] {
  const lines = payload.split("\n").filter(Boolean);
  const slides: Slide[] = [
    { kind: "hook", text: "One command. That's all it takes." },
    { kind: "body", text: lines.slice(0, Math.max(1, Math.ceil(lines.length / 2))).join("\n") },
    { kind: "body", text: lines.slice(Math.ceil(lines.length / 2)).join("\n") || "…" },
    { kind: "cta", text: "Follow for more teardowns." },
  ];
  return slides;
}
