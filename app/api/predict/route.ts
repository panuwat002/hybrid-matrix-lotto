import { NextResponse } from "next/server";
import HISTORICAL from "@/lib/data/historical.json";
import { AVAILABLE_MODELS, calculateWithModel } from "@/lib/engine/models";
import type { FormulaModelId, MatrixResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * What the site would serve for one draw, across every model.
 *
 * The recorder script reads this so the logged prediction is the same thing a
 * visitor sees, rather than a second implementation that can drift from it.
 */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";

  if (!/^\d{8}$/.test(date)) {
    return NextResponse.json(
      { ok: false, error: "date must be 8 digits, DDMMYYYY in BE (e.g. 01102569)" },
      { status: 400 },
    );
  }

  try {
    const models: Partial<Record<FormulaModelId, MatrixResult>> = {};
    for (const info of AVAILABLE_MODELS) {
      models[info.id] = calculateWithModel(info.id, date, HISTORICAL as any);
    }
    return NextResponse.json({ ok: true, data: { date, models } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to compute prediction" },
      { status: 500 },
    );
  }
}
