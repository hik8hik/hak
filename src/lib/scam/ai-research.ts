// AI-driven web research pipeline.
//
// Three steps, all logged and reproducible:
//   1. Ask the model for 3 search queries that would reveal whether
//      this domain is legitimate. The model does NOT search the web
//      directly; it produces queries we then execute.
//   2. Execute the queries against Google News RSS.
//   3. Ask the model to summarize the results into short cards.
//
// The output is appended as ScamFinding objects with kind "ai-research".
// These findings are excluded from the score by scan.ts, so the numeric
// verdict remains deterministic and auditable.

import type { ScanReport, ScamFinding, ScamSeverity } from "./types";

const TIMEOUT_MS = 22_000
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

function key(): string { return process.env.OPENROUTER_API_KEY || "" }
function model(): string {
  const m = process.env.OPENROUTER_MODEL || ""
  return (m && m.includes("/")) ? m : DEFAULT_MODEL
}
export function aiResearchConfigured(): boolean { return !!key() }

// ─── Step 1: query generation ───────────────────────────────────────

const QUERY_SYSTEM = `You help investigate whether a domain is legitimate. Given scan findings, produce exactly 3 search queries in JSON. The queries should be specific enough to distinguish a scam from a legitimate business.

Return JSON only:
{ "queries": ["q1", "q2", "q3"] }

Rules:
- Each query 3-10 words.
- At least one query should search for the exact hostname.
- Do not include the hosting platform name (Vercel, Netlify, etc.) unless the platform itself is the target.
- Prefer queries that would surface news, warnings, or official company pages.`

interface QueryRequest {
  hostname: string
  registrableDomain: string
  platformName: string | null
  brandHints: string[]
  topFindings: { title: string; severity: string }[]
  pageTitle: string | null
}

async function callModel(system: string, userPayload: unknown, maxTokens = 500): Promise<any | null> {
  const k = key()
  if (!k) return null
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + k,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hak.local",
        "X-Title": "hak-scam-research",
      },
      body: JSON.stringify({
        model: model(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!r.ok) return null
    const j = await r.json()
    const content = j?.choices?.[0]?.message?.content
    if (typeof content !== "string") return null
    try { return JSON.parse(content) } catch {
      const m = content.match(/\{[\s\S]*\}/)
      if (!m) return null
      try { return JSON.parse(m[0]) } catch { return null }
    }
  } catch { return null }
  finally { clearTimeout(t) }
}

// ─── Step 2: search execution ───────────────────────────────────────

interface NewsItem { title: string; link: string; source: string; pubDate: string }

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, String.fromCharCode(39))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
}

async function searchNews(q: string, max = 5): Promise<NewsItem[]> {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en&gl=US&ceid=US:en"
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 6000)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; hak-scam/1.0)" },
    })
    if (!r.ok) return []
    const xml = await r.text()
    const out: NewsItem[] = []
    const re = /<item>([\s\S]*?)<\/item>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(xml)) !== null && out.length < max) {
      const body = m[1]
      const title = decode(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim()
      const link = body.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || ""
      const pubDate = body.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || ""
      const source = decode(body.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || "").trim()
      if (title && link) out.push({ title, link, pubDate, source })
    }
    return out
  } catch { return [] }
  finally { clearTimeout(t) }
}

// ─── Step 3: summarization ──────────────────────────────────────────

const SUMMARY_SYSTEM = `You are a domain investigator. You receive scan findings about a domain plus raw search results. Produce 2-4 plain-English cards.

Return JSON only:
{
  "cards": [
    { "title": "...", "summary": "...", "severity": "critical|high|medium|low|info", "sources": ["https://..."] }
  ]
}

Rules:
- Every card must be supported by specific search results you were given.
- If the search results do not support any conclusion, return an empty cards array.
- Do NOT invent facts. If a source is only tangentially related, say so.
- Severity: critical = direct evidence of fraud; high = strong indicators; medium = suspicious context; low = weak signal; info = neutral context.`

// ─── Orchestrator ───────────────────────────────────────────────────

export async function runAiResearch(report: ScanReport): Promise<ScamFinding[]> {
  if (!aiResearchConfigured()) return []

  // 1. Produce queries.
  const brandHints: string[] = []
  const htmlFinding = report.findings.find((f) => f.kind === "html")
  if (htmlFinding) {
    const row = htmlFinding.evidence?.find((r) => r.label === "Likely impersonation")
    if (row) brandHints.push(...row.value.split(";").map((s) => s.trim().split(" ")[0]))
  }

  const req: QueryRequest = {
    hostname: report.hostname,
    registrableDomain: report.registrableDomain,
    platformName: report.platform?.name || null,
    brandHints,
    topFindings: report.findings
      .filter((f) => f.kind !== "verdict" && f.kind !== "narrative")
      .slice(0, 8)
      .map((f) => ({ title: f.title, severity: f.severity })),
    pageTitle: htmlFinding?.evidence?.find((r) => r.label === "Title")?.value || null,
  }

  const queryResp = await callModel(QUERY_SYSTEM, req, 300)
  const queries: string[] = Array.isArray(queryResp?.queries)
    ? queryResp.queries.slice(0, 3).map((q: unknown) => String(q).slice(0, 120))
    : []
  if (!queries.length) return []

  // 2. Execute.
  const results: { query: string; items: NewsItem[] }[] = []
  for (const q of queries) {
    const items = await searchNews(q, 5)
    results.push({ query: q, items })
  }
  const totalHits = results.reduce((n, r) => n + r.items.length, 0)
  if (totalHits === 0) {
    return [
      {
        id: "ai-research-empty", kind: "ai-research",
        title: "AI research: no matches",
        summary: "AI-generated queries produced no search results. This does not clear the domain \u2014 it simply means no public reporting was found.",
        severity: "info", confidence: "medium",
        evidence: queries.map((q, i) => ({ id: "ai.research.q" + i, label: "Query " + (i + 1), value: q })),
      },
    ]
  }

  // 3. Summarize.
  const summaryPayload = {
    report: {
      url: report.normalizedUrl,
      hostname: report.hostname,
      score: report.score,
      verdict: report.verdict,
      verdictSeverity: report.verdictSeverity,
      platform: report.platform?.name || null,
    },
    searchResults: results,
  }
  const summaryResp = await callModel(SUMMARY_SYSTEM, summaryPayload, 900)
  const cards: any[] = Array.isArray(summaryResp?.cards) ? summaryResp.cards.slice(0, 4) : []

  const findings: ScamFinding[] = []
  // Always include the search-query card so the reasoning is visible.
  findings.push({
    id: "ai-research-queries", kind: "ai-research",
    title: "AI-generated search queries",
    summary: queries.length + " quer" + (queries.length === 1 ? "y" : "ies") + " were generated and executed against Google News RSS. This card documents what was searched so the reasoning is reproducible.",
    severity: "info", confidence: "high",
    evidence: [
      ...queries.map((q, i) => ({ id: "ai.research.q" + i, label: "Query " + (i + 1), value: q })),
      { id: "ai.research.hits", label: "Results returned", value: String(totalHits) },
    ],
  })

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    const sev = String(c.severity || "info").toLowerCase()
    const valid = ["critical", "high", "medium", "low", "info"]
    const severity: ScamSeverity = (valid.includes(sev) ? sev : "info") as ScamSeverity
    const sources: string[] = Array.isArray(c.sources) ? c.sources.slice(0, 5).map(String) : []
    findings.push({
      id: "ai-research-" + i, kind: "ai-research",
      title: String(c.title || "AI research").slice(0, 160),
      summary: String(c.summary || "").slice(0, 900),
      severity, confidence: "medium",
      references: sources,
    })
  }
  return findings
}