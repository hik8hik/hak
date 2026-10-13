import { NextRequest, NextResponse } from "next/server";
import { fetchKevRecent } from "@/lib/fetchers";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("days"));
  const days = Math.max(1, Math.min(90, Number.isFinite(raw) ? raw : 7));
  const items = await fetchKevRecent(days);
  return NextResponse.json({ days, count: items.length, items });
}