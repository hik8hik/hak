import { NextRequest, NextResponse } from "next/server";
import { runAiResearch, aiResearchConfigured } from "@/lib/scam/ai-research";
import type { ScanReport } from "@/lib/scam/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!aiResearchConfigured()) {
    return NextResponse.json({ configured: false, findings: [] });
  }
  let report: ScanReport;
  try {
    const body = await req.json();
    report = body?.report;
    if (!report || typeof report !== "object") {
      return NextResponse.json({ error: "missing report" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  try {
    const findings = await runAiResearch(report);
    return NextResponse.json({ configured: true, findings });
  } catch (e) {
    console.warn("[hak/scam/research] failed:", String(e));
    return NextResponse.json({ configured: true, findings: [], error: String(e) }, { status: 200 });
  }
}
