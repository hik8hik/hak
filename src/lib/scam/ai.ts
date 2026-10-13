// OpenRouter narrative layer.
//
// The AI does NOT score. The score is computed locally from weighted
// findings. The AI only writes a plain-English explanation of the score,
// and every sentence it produces must cite specific evidence IDs.
//
// If the API key is missing or the call fails, the scanner falls back to
// a deterministic template narrative. Nothing about the app depends on
// the AI being available.

import type { ScamFinding, ScanReport, AiNarrative, ScamSeverity } from "./types";

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `You are a domain verification analyst.
You will receive structured findings from an automated scanner.
Your job is to write a plain-English narrative explaining what the domain is, grounded strictly in the evidence provided.

Rules:
1. Every sentence you write must reference the specific evidence IDs it relies on.
2. You may NOT invent findings, domains, companies, or facts not present in the input.
3. If a finding has severity "info", do not cite it as evidence of wrongdoing.
4. If the domain is a subdomain of a known hosting platform (Vercel, Netlify, GitHub Pages, etc.), do not treat the platform's DNS, TLS, or RDAP records as suspicious.
5. The numeric score you receive is computed locally and is authoritative. Your narrative must be consistent with it.
6. If there are no critical or high findings with high confidence, the severity you return must be "low" or "info".
7. Keep the narrative to 2-5 sentences. Be specific and concrete.

Return JSON in this exact shape:
{
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "narrative": "string with [ev:id] citations",
  "citations": [
    { "sentence": "string", "evidenceIds": ["id1", "id2"] }
  ]
}`;

function key(): string { return process.env.OPENROUTER_API_KEY || ""; }
function model(): string {
  const m = process.env.OPENROUTER_MODEL || "";
  // Reject placeholder values like "openrouter/free"
  if (!m || !m.includes("/")) return DEFAULT_MODEL;
  return m;
}

export function aiConfigured(): boolean { return !!key(); }

interface Payload {
  url: string;
  hostname: string;
  registrableDomain: string;
  platform: { id: string; name: string; reputation: string } | null;
  score: number;
  verdict: string;
  findings: {
    id: string;
    kind: string;
    title: string;
    summary: string;
    severity: string;
    confidence: string;
    evidence: { id: string; label: string; value: string; bad?: boolean }[];
  }[];
}

function compact(report: ScanReport): Payload {
  return {
    url: report.normalizedUrl,
    hostname: report.hostname,
    registrableDomain: report.registrableDomain,
    platform: report.platform || null,
    score: report.score,
    verdict: report.verdict,
    findings: report.findings
      .filter((f) => f.kind !== "verdict" && f.kind !== "narrative")
      .map((f) => ({
        id: f.id, kind: f.kind, title: f.title, summary: f.summary,
        severity: f.severity, confidence: f.confidence || "medium",
        evidence: (f.evidence || []).map((e, i) => ({
          id: e.id || (f.id + "." + i),
          label: e.label, value: e.value, bad: !!e.bad,
        })),
      })),
  };
}

export async function narrateWithAi(report: ScanReport): Promise<AiNarrative | null> {
  const k = key();
  if (!k) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + k,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hak.local",
        "X-Title": "hak-scam-scanner",
      },
      body: JSON.stringify({
        model: model(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(compact(report)) },
        ],
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("[hak/scam] AI HTTP", r.status, txt.slice(0, 200));
      return null;
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    let parsed: any;
    try { parsed = JSON.parse(content); } catch {
      // Sometimes the model wraps in fences
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch { return null; }
    }
    const sev = String(parsed.severity || "").toLowerCase();
    const valid = ["critical","high","medium","low","info"];
    const severity: ScamSeverity = (valid.includes(sev) ? sev : "info") as ScamSeverity;
    const narrative = String(parsed.narrative || "").slice(0, 1200);
    const citations = Array.isArray(parsed.citations)
      ? parsed.citations.slice(0, 20).map((c: any) => ({
          sentence: String(c?.sentence || "").slice(0, 400),
          evidenceIds: Array.isArray(c?.evidenceIds)
            ? c.evidenceIds.slice(0, 8).map(String)
            : [],
        }))
      : [];
    if (!narrative) return null;
    return { severity, narrative, citations, model: model() };
  } catch (e) {
    console.warn("[hak/scam] AI call failed:", String(e));
    return null;
  } finally {
    clearTimeout(t);
  }
}
