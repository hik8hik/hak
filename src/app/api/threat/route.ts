import { NextRequest, NextResponse } from "next/server";
import { getThreatById } from "@/lib/fetchers";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const item = await getThreatById(id);
  if (!item) return NextResponse.json({ error: "not found", id }, { status: 404 });
  return NextResponse.json(item);
}
