// Known-threat pattern tables used across the scanner.
//
// All patterns are conservative on purpose: better to miss a weak signal
// than to fire a critical finding on a legitimate site.

export interface ThreatPattern {
  re: RegExp;
  label: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
}

// Asset names in bundled JavaScript that indicate a fake trading /
// investment / admin platform. Common in Kenyan and West African
// investment scams (Ziidi lookalikes, Quotex clones, etc.).
export const SUSPICIOUS_ASSET_PATTERNS: ThreatPattern[] = [
  { re: /admin[-_]?login/i,        label: "admin-login asset",       severity: "critical" },
  { re: /admin[-_]?panel/i,        label: "admin-panel asset",       severity: "critical" },
  { re: /admin[-_]?payouts?/i,     label: "admin-payouts asset",     severity: "critical" },
  { re: /admin[-_]?plans?/i,       label: "admin-plans asset",       severity: "high" },
  { re: /admin[-_]?dashboard/i,    label: "admin-dashboard asset",   severity: "high" },
  { re: /kyc[-_]?gate/i,           label: "KYC gate",                severity: "critical" },
  { re: /kyc[-_]?form/i,           label: "KYC form",                severity: "high" },
  { re: /kyc[-_]?upload/i,         label: "KYC upload",              severity: "high" },
  { re: /use[-_]auth/i,            label: "auth hook",               severity: "low" },
  { re: /auth[-_]?middleware/i,    label: "auth middleware",         severity: "low" },
  { re: /mpesa[._-]?functions?/i,  label: "M-PESA functions",        severity: "high" },
  { re: /mobile[._-]?money/i,      label: "mobile-money asset",      severity: "high" },
  { re: /withdraw[._-]?request/i,  label: "withdrawal request",      severity: "high" },
  { re: /withdraw[._-]?funds/i,    label: "withdrawal funds",        severity: "high" },
  { re: /payout[-_]?queue/i,       label: "payout queue",            severity: "high" },
  { re: /payout[-_]?history/i,     label: "payout history",          severity: "medium" },
  { re: /deposit[-_]?request/i,    label: "deposit request",         severity: "medium" },
  { re: /install[-_]?app[-_]?button/i, label: "install-app button",  severity: "medium" },
  { re: /install[-_]?promo/i,      label: "install-app promo",       severity: "low" },
];

// String patterns inside the bundle body itself (not asset names).
export const SUSPICIOUS_BODY_PATTERNS: ThreatPattern[] = [
  { re: /eval\s*\(\s*atob\s*\(/g,         label: "eval(atob(...)) - obfuscated payload", severity: "critical" },
  { re: /document\.write\s*\(\s*unescape/, label: "document.write(unescape(...))",       severity: "high" },
  { re: /new\s+Function\s*\(\s*atob/,     label: "new Function(atob(...))",              severity: "critical" },
  { re: /\.fromCharCode\s*\(\s*0x/g,      label: "fromCharCode with hex (obfuscation)",  severity: "medium" },
  { re: /crypto\s*\.\s*subtle\s*\.\s*encrypt/g, label: "WebCrypto encrypt (may be legit)", severity: "info" },
  { re: /\bbase64[._-]?decode\b/gi,       label: "base64 decode helper",                 severity: "low" },
  { re: /\bwithdraw[a-z]*\s*\(/gi,        label: "withdraw() function",                  severity: "medium" },
  { re: /\brequestPayout|\bsendPayout\b/g, label: "payout trigger",                      severity: "high" },
  { re: /\bverifyOTP|\bcheckOTP|\bconfirmOTP\b/g, label: "OTP verification flow",        severity: "medium" },
  { re: /\bvalidateMpesaPin|\bmpesaPin\b/g, label: "M-PESA PIN handling",                severity: "critical" },
];

// Cert badges usually rendered as images. If the file name or alt text
// contains any of these and the domain is young or hosting is anonymised,
// it is performance theatre.
export const CERT_BADGE_PATTERNS: RegExp[] = [
  /soc[\s_-]?2/i,
  /iso[\s_-]?27001/i,
  /pci[\s_-]?dss/i,
  /hipaa/i,
  /gdpr[\s_-]?compliant/i,
  /ssl[\s_-]?secured/i,
  /bank[\s_-]?grade/i,
];

// Button / link text that prompts a sideloaded app install.
export const INSTALL_APP_PATTERNS: RegExp[] = [
  /install\s+(?:our\s+)?app/i,
  /download\s+apk/i,
  /get\s+it\s+on\s+android/i,
  /apk\s+download/i,
  /android\s+app\s+link/i,
];

// Social handle prefixes we look for. Combined with the brands list.
export const SOCIAL_HANDLE_PREFIXES = ["@"];

// Referenced M-PESA / mobile-money brand tokens that frequently appear
// in Kenyan investment scams.
export const KENYAN_BRAND_TOKENS = [
  "safaricom", "mpesa", "m-pesa", "ziidi", "nse", "nairobi securities exchange",
];

// Bulletproof / abuse-friendly hosting ASNs seen in Kenyan scam reports.
// This list is short on purpose; it flags the clearest offenders only.
export const BULLETPROOF_ASNS: Record<string, string> = {
  "AS202422": "goproxy / frequently-abused",
  "AS200373": "Stark Industries Solutions (bulletproof)",
  "AS44477": "Stark Industries Solutions (bulletproof)",
  "AS213248": "Kurz / abuse-friendly",
  "AS401120": "IP Volume / abuse-friendly",
  "AS46997": "Stark Industries Solutions (bulletproof)",
};
