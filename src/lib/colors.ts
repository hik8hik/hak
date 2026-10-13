export const SEVERITY_COLORS: Record<string,string> = {
  critical: "var(--cs-critical)", high: "var(--cs-high)",
  medium: "var(--cs-medium)", low: "var(--cs-low)", none: "var(--cs-none)",
};
export const TACTIC_COLORS: Record<string,string> = {
  "Reconnaissance": "#8892a6", "Resource Development": "#5a8fa8",
  "Initial Access": "#537FFF", "Execution": "#169200",
  "Persistence": "#9400A8", "Privilege Escalation": "#D500B7",
  "Defense Evasion": "#26BFFD", "Credential Access": "#FF7E1E",
  "Discovery": "#FFC107", "Lateral Movement": "#E85FD5",
  "Collection": "#4ECB4A", "Command and Control": "#000EBC",
  "Exfiltration": "#C96AE0", "Impact": "#DD0008",
};
export function severityVar(s?: string): string {
  return SEVERITY_COLORS[(s || "none").toLowerCase()] || SEVERITY_COLORS.none;
}
export function tacticVar(t?: string): string {
  return TACTIC_COLORS[t || ""] || "var(--cs-none)";
}
