import { FALLBACK } from "./fallback";
import type { ThreatItem } from "./types";

// Curated mapping: name → CVE. A full CPE-matching engine is planned for v2.
const KNOWN: Record<string, string[]> = {
  "log4j": ["CVE-2021-44228"],
  "log4j-core": ["CVE-2021-44228"],
  "xz": ["CVE-2024-3094"],
  "liblzma": ["CVE-2024-3094"],
  "lodash": [],
  "spring-core": [],
  "spring": [],
  "openssl": [],
  "requests": [],
  "urllib3": [],
  "axios": [],
};

export function scan(text: string): ThreatItem[] {
  const lower = text.toLowerCase();
  const hits = new Set<string>();
  for (const [name, cves] of Object.entries(KNOWN)) {
    if (lower.includes(`"${name}"`) || lower.includes(`${name}:`) || lower.includes(`${name}=`)) {
      for (const c of cves) hits.add(c);
    }
  }
  return [...hits]
    .map((id) => FALLBACK.find((x) => x.id === id))
    .filter(Boolean) as ThreatItem[];
}
