import { NextRequest, NextResponse } from "next/server";
import { scanUrl } from "@/lib/scam/scan";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let url = "";
  try {
    const body = await req.json();
    url = String(body?.url || "").trim();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
  if (url.length > 2048) return NextResponse.json({ error: "url too long" }, { status: 400 });
  try {
    const report = await scanUrl(url);
    return NextResponse.json(report);
  } catch (e) {
    console.error("[hak/scam] scan failed", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
