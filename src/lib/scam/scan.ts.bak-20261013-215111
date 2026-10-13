import { parseUrl, analyzeLexical } from "./parse";
import { runDns } from "./dns";
import { runRdap } from "./rdap";
import { runTls } from "./tls";
import { runReputation } from "./reputation";
import { analyzeHtml } from "./html";
import { analyzeJsBundles } from "./jsbundles";
import { analyzeHosting } from "./hosting";
import { analyzeNews } from "./news";
import { composeNarrative } from "./report";
import { findPlatform, isPlatformBrand } from "./platforms";
import { BRANDS } from "./brands";
import {
  SEVERITY_WEIGHT, CONFIDENCE_MULT,
  type ScanReport, type ScamFinding, type ScamSeverity, type EvidenceRow, type PlatformInfo,
} from "./types";

function scoreFindings(findings: ScamFinding[]): { score: number; verdict: string; verdictSeverity: ScamSeverity } {
  let raw = 0;
  for (const f of findings) {
    if (f.kind === "verdict" || f.kind === "narrative" || f.kind === "platform") continue;
    if (f.skippedReason) continue;
    const w = SEVERITY_WEIGHT[f.severity] || 0;
    const c = CONFIDENCE_MULT[f.confidence || "medium"];
    raw += w * c;
  }
  const score = Math.min(100, Math.round(raw));
  let verdict: string;
  let verdictSeverity: ScamSeverity;
  if (score >= 70) {
    verdict = "Multiple strong indicators of phishing or malicious activity. Do not interact with this page.";
    verdictSeverity = "critical";
  } else if (score >= 40) {
    verdict = "Several concerning signals detected. Investigate further before interacting.";
    verdictSeverity = "high";
  } else if (score >= 15) {
    verdict = "Some suspicious characteristics were found, but the evidence is not conclusive.";
    verdictSeverity = "medium";
  } else if (score > 0) {
    verdict = "A few minor observations. Nothing strongly indicates malicious intent.";
    verdictSeverity = "low";
  } else {
    verdict = "No suspicious characteristics detected in the layers we could reach.";
    verdictSeverity = "info";
  }
  return { score, verdict, verdictSeverity };
}

function verdictFinding(score: number, verdict: string, severity: ScamSeverity, findings: ScamFinding[]): ScamFinding {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.kind === "verdict" || f.kind === "narrative") continue;
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  const evidence: EvidenceRow[] = [
    { id: "verdict.score", label: "Risk score", value: score + "/100" },
    { id: "verdict.critical", label: "Critical findings", value: String(counts.critical), bad: counts.critical > 0 },
    { id: "verdict.high", label: "High findings", value: String(counts.high), bad: counts.high > 0 },
    { id: "verdict.medium", label: "Medium findings", value: String(counts.medium) },
    { id: "verdict.low", label: "Low findings", value: String(counts.low) },
    { id: "verdict.info", label: "Informational", value: String(counts.info) },
  ];
  return { id: "verdict", kind: "verdict", title: "Verdict", summary: verdict, severity, confidence: "high", evidence };
}

function platformFinding(info: PlatformInfo): ScamFinding {
  return {
    id: "platform", kind: "platform",
    title: "Hosting platform",
    summary: "Subdomain is user-hosted on " + info.name + ". Platform-managed DNS, TLS, and infrastructure signals are not held against the operator.",
    severity: "info", confidence: "high",
    evidence: [
      { id: "platform.name", label: "Platform", value: info.name },
      { id: "platform.id", label: "Identifier", value: info.id },
      { id: "platform.rep", label: "Platform reputation", value: info.reputation },
    ],
  };
}

export async function scanUrl(input: string): Promise<ScanReport> {
  const t0 = Date.now();
  const parsed = parseUrl(input);
  const findings: ScamFinding[] = [];

  const lex = analyzeLexical(parsed);
  findings.push(lex.finding);

  if (!parsed.url) {
    const s = scoreFindings(findings);
    const v = verdictFinding(s.score, s.verdict, s.verdictSeverity, findings);
    findings.unshift(v);
    return {
      url: input, normalizedUrl: input, hostname: "", registrableDomain: "",
      scannedAt: new Date().toISOString(),
      score: s.score, verdict: s.verdict, verdictSeverity: s.verdictSeverity,
      findings, durationMs: Date.now() - t0, platform: null, ai: null,
    };
  }

  // Detect platform BEFORE running any layer, so each layer can adapt.
  const platform = findPlatform(parsed.registrableDomain)
  const platformInfo: PlatformInfo | null = platform
    ? { id: platform.id, name: platform.name, reputation: platform.reputation }
    : null

  // ── Phase 1: parallel network layers ─────────────────────────────
  const [dnsR, rdapR, tlsR, repFindings, htmlR] = await Promise.all([
    runDns(parsed.hostname, parsed.registrableDomain, platform),
    runRdap(parsed.registrableDomain, platform),
    runTls(parsed.hostname, platform),
    runReputation(parsed.normalized, parsed.hostname),
    analyzeHtml(parsed.normalized, parsed.registrableDomain, BRANDS, platform),
  ]);

  findings.push(rdapR.finding)
  findings.push(dnsR.finding)
  findings.push(tlsR.finding)
  for (const f of repFindings) findings.push(f)
  findings.push(htmlR.finding)

  // ── Phase 2: depend on phase-1 output ────────────────────────────
  const impersonatedBrands = htmlR.analysis.brandMentions
    .filter((m) => m.score >= 2)
    .map((m) => m.brand)
    .filter((b) => !isPlatformBrand(platform, b))

  const [jsR, hostingR, newsR] = await Promise.all([
    analyzeJsBundles(htmlR.analysis.scriptSrcs, parsed.registrableDomain, platform),
    analyzeHosting(dnsR.a, platform),
    analyzeNews(parsed.registrableDomain, parsed.hostname, impersonatedBrands, platform),
  ]);

  findings.push(jsR.finding)
  findings.push(hostingR.finding)
  findings.push(newsR.finding)

  // ── Score, verdict, narrative ────────────────────────────────────
  const s = scoreFindings(findings)
  const v = verdictFinding(s.score, s.verdict, s.verdictSeverity, findings)

  const base: ScanReport = {
    url: input,
    normalizedUrl: parsed.normalized,
    hostname: parsed.hostname,
    registrableDomain: parsed.registrableDomain,
    scannedAt: new Date().toISOString(),
    score: s.score, verdict: s.verdict, verdictSeverity: s.verdictSeverity,
    findings, durationMs: Date.now() - t0,
    platform: platformInfo, ai: null,
  };

  const { narrative, ai } = await composeNarrative(base)

  const narrativeFinding: ScamFinding = {
    id: "narrative", kind: "narrative",
    title: "Executive summary",
    summary: narrative,
    severity: s.verdictSeverity,
    confidence: "high",
  };

  // Order: verdict, platform (if any), narrative, then the rest.
  const rest = findings.filter((f) => f !== v)
  const ordered = platformInfo
    ? [v, platformFinding(platformInfo), narrativeFinding, ...rest]
    : [v, narrativeFinding, ...rest]

  return {
    ...base,
    narrative,
    ai,
    findings: ordered,
    durationMs: Date.now() - t0,
  };
}