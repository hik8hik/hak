import type { ScamFinding, EvidenceRow } from "./types";
import type { Platform } from "./platforms";
import { SUSPICIOUS_ASSET_PATTERNS, SUSPICIOUS_BODY_PATTERNS } from "./threats";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const MAX_PER_BUNDLE = 500_000;
const MAX_BUNDLES = 10;
const TIMEOUT_MS = 8_000;

interface AssetHit { asset: string; pattern: string; severity: "critical" | "high" | "medium" | "low" | "info"; }
interface BodyHit { bundle: string; pattern: string; severity: "critical" | "high" | "medium" | "low" | "info"; }

export interface JsAnalysis {
  bundlesFetched: number;
  bundlesFailed: number;
  totalBytes: number;
  assetHits: AssetHit[];
  bodyHits: BodyHit[];
  apiEndpoints: string[];
}

async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "User-Agent": UA, "Accept": "application/javascript,text/javascript,*/*" },
    });
    if (!r.ok) return null;
    const text = await r.text();
    return text.length > MAX_PER_BUNDLE ? text.slice(0, MAX_PER_BUNDLE) : text;
  } catch { return null; }
  finally { clearTimeout(t); }
}

function findAssetHitsInUrl(url: string): AssetHit[] {
  const hits: AssetHit[] = [];
  for (const p of SUSPICIOUS_ASSET_PATTERNS) {
    p.re.lastIndex = 0;
    if (p.re.test(url)) {
      // Find the actual matched chunk for display
      const m = url.match(p.re);
      hits.push({ asset: url.split("/").pop() || url, pattern: m ? m[0] : p.label, severity: p.severity });
    }
  }
  return hits;
}

function findBodyHits(bundleUrl: string, body: string): BodyHit[] {
  const hits: BodyHit[] = [];
  for (const p of SUSPICIOUS_BODY_PATTERNS) {
    p.re.lastIndex = 0;
    const m = body.match(p.re);
    if (m && m.length) {
      hits.push({ bundle: bundleUrl.split("/").pop() || bundleUrl, pattern: p.label, severity: p.severity });
    }
  }
  return hits;
}

function extractApiEndpoints(body: string): string[] {
  const set = new Set<string>();
  // Match strings like "https://host/api/foo" or "/api/v1/..."
  const absolute = /https?:\/\/[A-Za-z0-9.-]+\/api\/[A-Za-z0-9_\-\/]+/g;
  const relative = /["'`]\/api\/[A-Za-z0-9_\-\/]+["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = absolute.exec(body)) !== null) set.add(m[0]);
  while ((m = relative.exec(body)) !== null) set.add(m[0].slice(1, -1));
  return Array.from(set).slice(0, 20);
}

export async function analyzeJsBundles(
  scriptSrcs: string[],
  registrableDomain: string,
  platform: Platform | null = null,
): Promise<{ finding: ScamFinding; analysis: JsAnalysis }> {
  // 1. Asset-name hits — no network needed.
  const assetHits: AssetHit[] = [];
  for (const src of scriptSrcs) {
    for (const h of findAssetHitsInUrl(src)) assetHits.push(h);
  }

  // 2. Pick a small set of bundles to actually fetch and grep.
  const sameOrigin = scriptSrcs.filter((u) => {
    try { return new URL(u).hostname.split(".").slice(-2).join(".") === registrableDomain; } catch { return false; }
  });
  const targets = sameOrigin.slice(0, MAX_BUNDLES);
  const bundlesFailed = Math.max(0, targets.length - (await Promise.all(targets.map((u) => fetchText(u).then((t) => (t ? 1 : 0))))).reduce((a, b) => a + b, 0));

  let totalBytes = 0;
  const bodyHits: BodyHit[] = [];
  const apiSet = new Set<string>();
  let bundlesFetched = 0;

  await Promise.all(targets.map(async (u) => {
    const body = await fetchText(u);
    if (!body) return;
    bundlesFetched += 1;
    totalBytes += body.length;
    for (const h of findBodyHits(u, body)) bodyHits.push(h);
    for (const e of extractApiEndpoints(body)) apiSet.add(e);
  }));

  const analysis: JsAnalysis = {
    bundlesFetched, bundlesFailed, totalBytes,
    assetHits, bodyHits,
    apiEndpoints: Array.from(apiSet),
  };

  // Build the finding
  const evidence: EvidenceRow[] = [];
  const flags: string[] = [];

  if (assetHits.length) {
    const labels = Array.from(new Set(assetHits.map((h) => h.pattern))).slice(0, 10);
    evidence.push({
      label: "Suspicious asset names",
      value: labels.join(", "),
      bad: true,
    });
    flags.push("asset-hits");
  }

  if (bodyHits.length) {
    const labels = Array.from(new Set(bodyHits.map((h) => h.pattern))).slice(0, 10);
    evidence.push({
      label: "Suspicious code patterns",
      value: labels.join(" | "),
      bad: true,
    });
    flags.push("body-hits");
  }

  const api = Array.from(apiSet);
  if (api.length) {
    evidence.push({
      label: "API endpoints referenced",
      value: api.slice(0, 6).join(", ") + (api.length > 6 ? " +" + (api.length - 6) + " more" : ""),
    });
  }

  evidence.push({ label: "Bundles fetched", value: String(bundlesFetched) });
  evidence.push({ label: "Total JS scanned", value: Math.round(totalBytes / 1024) + " KB" });

  // Severity
  const criticalAssets = assetHits.filter((h) => h.severity === "critical");
  const criticalBodies = bodyHits.filter((h) => h.severity === "critical");
  let severity: ScamFinding["severity"] = "info";
  if (criticalAssets.length >= 2 || criticalBodies.length) severity = "critical";
  else if (assetHits.some((h) => h.severity === "high") || bodyHits.some((h) => h.severity === "high")) severity = "high";
  else if (assetHits.length || bodyHits.length) severity = "medium";

  const summary = criticalAssets.length
    ? "JavaScript bundle contains " + criticalAssets.length + " admin/back-office asset(s) \u2014 this is a functional backend, not a marketing page."
    : assetHits.length || bodyHits.length
      ? (assetHits.length + bodyHits.length) + " suspicious JS indicator(s) detected."
      : "No suspicious JS patterns detected in the bundles we could reach.";

  return {
    analysis,
    finding: {
      id: "jsbundles", kind: "jsbundles",
      title: "JavaScript bundle analysis",
      summary, severity, evidence,
    },
  };
}
