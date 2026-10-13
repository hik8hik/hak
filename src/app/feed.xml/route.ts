import { getFeed } from "@/lib/fetchers";

export const runtime = "nodejs";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] as string));
}

export async function GET() {
  const items = await getFeed("kev");
  const updated = new Date().toISOString();
  const entries = items.slice(0, 50).map((it) => `
    <entry>
      <id>tag:hak,2026:${esc(it.id)}</id>
      <title>${esc(it.title)}</title>
      <updated>${updated}</updated>
      <summary>${esc(it.summary.slice(0, 400))}</summary>
    </entry>`).join("");
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>hak — KEV feed</title>
  <id>tag:hak,2026:feed</id>
  <updated>${updated}</updated>
  ${entries}
</feed>`;
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
}
