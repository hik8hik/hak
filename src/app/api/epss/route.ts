import { NextRequest, NextResponse } from "next/server";
import { fetchEpss } from "@/lib/epss";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const cve = req.nextUrl.searchParams.get("cve") || "";
  if (!cve) return NextResponse.json({ error: "missing cve" }, { status: 400 });
  const r = await fetchEpss(cve);
  if (!r) return NextResponse.json({ error: "no epss" }, { status: 404 });
  return NextResponse.json(r);
}
