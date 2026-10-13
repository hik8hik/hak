import { NextRequest, NextResponse } from "next/server";
import { scan } from "@/lib/stack";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  return NextResponse.json(scan(String(text || "")));
}
