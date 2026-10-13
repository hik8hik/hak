import type { ThreatItem } from "./types";

export interface Question { prompt: string; promptKind: string; options: { id: string; label: string }[]; answer: string; }

export function makeQuestion(pool: ThreatItem[]): Question {
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
  const answer = shuffled[0];
  const promptKind = "Which technique is described?";
  const prompt = answer.summary.slice(0, 260);
  const options = shuffled.map((x) => ({ id: x.id, label: `${x.id} — ${x.title}` })).sort(() => Math.random() - 0.5);
  return { prompt, promptKind, options, answer: answer.id };
}
