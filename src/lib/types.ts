export type Severity = "critical" | "high" | "medium" | "low" | "none";
export type ThreatKind = "cve" | "attack" | "cwe" | "kev";

export interface ThreatItem {
  id: string; kind: ThreatKind; title: string; summary: string;
  severity?: Severity; tactics?: string[]; platforms?: string[];
  mitigations?: string[]; references?: string[]; raw: unknown;
}

export interface ExportPreset { id: string; label: string; w: number; h: number; pr: number; }

export const PRESETS: ExportPreset[] = [
  { id: "reel4k",   label: "Reel 4K",   w: 1080, h: 1920, pr: 2 },
  { id: "reel8k",   label: "Reel 8K",   w: 1080, h: 1920, pr: 4 },
  { id: "post4k",   label: "Post 4K",   w: 1080, h: 1350, pr: 2 },
  { id: "square2k", label: "Square 2K", w: 1024, h: 1024, pr: 2 },
  { id: "thumb2k",  label: "Thumb 2K",  w: 1280, h: 720,  pr: 2 },
  { id: "wide4k",   label: "Wide 4K",   w: 1920, h: 1080, pr: 2 },
];
