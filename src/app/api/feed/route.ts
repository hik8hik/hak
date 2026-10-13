import { NextRequest, NextResponse } from "next/server";
import { getFeed } from "@/lib/fetchers";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") || "cve";
  return NextResponse.json(await getFeed(source));
}
