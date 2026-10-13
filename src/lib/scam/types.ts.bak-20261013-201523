export type ScamSeverity = "critical" | "high" | "medium" | "low" | "info";
export type ScamConfidence = "high" | "medium" | "low";

export type ScamKind =
  | "verdict" | "narrative" | "lexical" | "whois" | "dns" | "tls"
  | "reputation" | "host" | "html" | "jsbundles" | "hosting"
  | "news" | "impersonation" | "platform";

export interface EvidenceRow {
  label: string;
  value: string;
  bad?: boolean;
  /** Evidence id, used by the AI narrative to cite specific facts. */
  id?: string;
}

export interface ScamFinding {
  id: string;
  kind: ScamKind;
  title: string;
  summary: string;
  severity: ScamSeverity;
  /** How much this finding should influence the score. Default: medium. */
  confidence?: ScamConfidence;
  evidence?: EvidenceRow[];
  references?: string[];
  raw?: unknown;
  /** Set when the finding was suppressed because of platform context. */
  skippedReason?: string;
}

export interface PlatformInfo {
  id: string;
  name: string;
  reputation: "good" | "neutral" | "abuse-heavy";
}

export interface AiCitation {
  sentence: string;
  evidenceIds: string[];
}

export interface AiNarrative {
  severity: ScamSeverity;
  narrative: string;
  citations: AiCitation[];
  model: string;
}

export interface ScanReport {
  url: string;
  normalizedUrl: string;
  hostname: string;
  registrableDomain: string;
  scannedAt: string;
  score: number;
  verdict: string;
  verdictSeverity: ScamSeverity;
  narrative?: string;
  findings: ScamFinding[];
  durationMs: number;
  platform?: PlatformInfo | null;
  ai?: AiNarrative | null;
}

export const SEVERITY_WEIGHT: Record<ScamSeverity, number> = {
  critical: 40, high: 20, medium: 8, low: 3, info: 0,
};

// Confidence scales the effective weight. An absence-of-evidence finding
// at low confidence contributes almost nothing.
export const CONFIDENCE_MULT: Record<ScamConfidence, number> = {
  high: 1.0, medium: 0.7, low: 0.3,
};

export const SEVERITY_ORDER: ScamSeverity[] = ["critical", "high", "medium", "low", "info"];
