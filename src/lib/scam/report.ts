import type { ScanReport } from "./types";
import { narrateWithAi } from "./ai";

/**
 * Template narrative — used when the AI is unavailable.
 * Grounded: each sentence is drawn only from findings that actually exist.
 */
export function templateNarrative(report: ScanReport): string {
  const parts: string[] = [];
  const f = (id: string) => report.findings.find((x) => x.id === id);

  if (report.verdictSeverity === "critical") parts.push("This domain shows multiple strong indicators of phishing or malicious intent.");
  else if (report.verdictSeverity === "high") parts.push("This domain shows several concerning signals.");
  else if (report.verdictSeverity === "medium") parts.push("This domain has some characteristics worth noting, but the evidence is not conclusive.");
  else if (report.verdictSeverity === "low") parts.push("This domain has a few minor observations.");
  else parts.push("No suspicious characteristics were detected in the layers we could reach.");

  const whois = f("whois");
  if (whois && whois.severity !== "info") parts.push(whois.summary);

  const news = f("news");
  if (news && news.severity === "critical") parts.push(news.summary);

  const js = f("jsbundles");
  if (js && js.severity === "critical") parts.push(js.summary);

  const html = f("html");
  if (html && (html.severity === "high" || html.severity === "critical")) parts.push(html.summary);

  const hosting = f("hosting");
  if (hosting && hosting.severity === "critical") parts.push(hosting.summary);

  if (report.platform && report.platform.reputation === "good" && report.score < 15) {
    parts.push("The subdomain is hosted on " + report.platform.name + ", which manages DNS, TLS and edge infrastructure for its subdomains. Platform-managed signals are not held against the operator.");
  }

  parts.push(report.verdict);
  return parts.join(" ");
}

export async function composeNarrative(report: ScanReport): Promise<{ narrative: string; ai: ScanReport["ai"] }> {
  const ai = await narrateWithAi(report);
  if (ai && ai.narrative) {
    return { narrative: ai.narrative, ai };
  }
  return { narrative: templateNarrative(report), ai: null };
}
