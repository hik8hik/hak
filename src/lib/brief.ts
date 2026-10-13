import type { ThreatItem } from "./types";

export interface BriefSection { title: string; items: ThreatItem[]; }

export function buildBrief({ kev, cve, attack }: { kev: ThreatItem[]; cve: ThreatItem[]; attack: ThreatItem[] }): { sections: BriefSection[] } {
  return {
    sections: [
      { title: "New to KEV", items: kev.slice(0, 6) },
      { title: "Recent CVEs", items: cve.slice(0, 6) },
      { title: "Technique spotlight", items: attack.slice(0, 4) },
    ],
  };
}
