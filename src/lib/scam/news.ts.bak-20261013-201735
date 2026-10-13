import type { ScamFinding, EvidenceRow } from "./types";
import type { Platform } from "./platforms";

const TIMEOUT_MS = 7000;

export interface NewsHit {
  title: string; link: string; pubDate: string; source: string;
  /** True only when the specific hostname string is present in the title or summary. */
  specificMatch: boolean;
}

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function extractItems(xml: string, max = 6): NewsHit[] {
  const out: NewsHit[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && out.length < max) {
    const body = m[1];
    const title = decode(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const link = body.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || "";
    const pubDate = body.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    const source = decode(body.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || "").trim();
    if (title && link) out.push({ title, link, pubDate, source, specificMatch: false });
  }
  return out;
}

async function searchNews(query: string): Promise<NewsHit[]> {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-KE&gl=KE&ceid=KE:en";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; hak-scam/1.0)" },
    });
    if (!r.ok) return [];
    return extractItems(await r.text());
  } catch { return []; }
  finally { clearTimeout(t); }
}

const SCAM_WORDS = 'scam OR fraud OR phishing OR warning OR fake OR impersonation';

/**
 * News search is scoped:
 *   1. Always query the exact hostname (not just the registrable domain).
 *   2. Only query brand names if impersonation was independently detected.
 *   3. When a platform is detected, do NOT search for the platform name —
 *      news about Vercel-wide abuse is not about this subdomain.
 *   4. A hit only counts as evidence if the exact hostname appears in
 *      the title or summary. Generic brand-only hits downgrade to info.
 */
export async function analyzeNews(
  registrableDomain: string,
  fullHostname: string,
  impersonatedBrands: string[],
  platform: Platform | null,
): Promise<{ finding: ScamFinding; hits: NewsHit[] }> {
  const queries: string[] = [];
  if (fullHostname && fullHostname !== registrableDomain) {
    queries.push('"' + fullHostname + '" ' + SCAM_WORDS);
  }
  queries.push('"' + registrableDomain + '" ' + SCAM_WORDS);

  // Only search for brands that were independently identified as being
  // impersonated, and never search for the hosting platform's name.
  for (const b of impersonatedBrands) {
    if (platform && platform.expectedBrands.some((x) => b.toLowerCase().includes(x))) continue;
    queries.push('"' + b + '" scam OR phishing warning');
  }

  const all: NewsHit[] = [];
  const seen = new Set<string>();
  const targetStr = fullHostname.toLowerCase();
  const regStr = registrableDomain.toLowerCase();
  for (const q of queries) {
    const hits = await searchNews(q);
    for (const h of hits) {
      if (seen.has(h.link)) continue;
      seen.add(h.link);
      const hay = (h.title + " " + h.link).toLowerCase();
      h.specificMatch = hay.includes(targetStr);
      all.push(h);
    }
  }

  const specific = all.filter((h) => h.specificMatch);
  const generic = all.filter((h) => !h.specificMatch);

  const evidence: EvidenceRow[] = [];
  for (const h of specific.slice(0, 5)) {
    evidence.push({ id: "news." + Math.random().toString(36).slice(2, 8), label: h.source || "News", value: h.title, bad: true });
  }
  if (!specific.length && generic.length) {
    evidence.push({
      id: "news.generic",
      label: "Note",
      value: generic.length + " article(s) about similar domains exist, but none mention this exact hostname.",
    });
  }

  // Specific matches only → critical. Generic only → info.
  const severity: ScamFinding["severity"] = specific.length ? "critical" : "info";
  const confidence: ScamFinding["confidence"] = specific.length ? "high" : "low";
  const summary = specific.length
    ? specific.length + " public warning(s) mention this exact hostname."
    : "No public warnings found that specifically mention this hostname.";

  return {
    hits: specific,
    finding: {
      id: "news", kind: "news", title: "News & public warnings",
      summary, severity, confidence, evidence,
      references: specific.slice(0, 5).map((h) => h.link),
    },
  };
}
