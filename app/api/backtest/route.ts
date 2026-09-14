import { NextResponse } from "next/server";
import HISTORICAL from "@/lib/data/historical.json";
import { runBacktest } from "@/lib/engine/backtest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = runBacktest(HISTORICAL as any, {
      minHistoryWindow: 30,
    });
    return NextResponse.json({ ok: true, data: report });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to run backtest" },
      { status: 500 },
    );
  }
}
