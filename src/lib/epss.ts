export interface EpssRow { cve: string; epss: number; percentile: number; date: string; }
export async function fetchEpss(cve: string): Promise<{ p: number; pct: number } | null> {
  try {
    const r = await fetch(`https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`, { next: { revalidate: 86400 } } as any);
    if (!r.ok) return null;
    const d = await r.json();
    const row = d?.data?.[0];
    if (!row) return null;
    return { p: parseFloat(row.epss), pct: parseFloat(row.percentile) };
  } catch { return null; }
}
