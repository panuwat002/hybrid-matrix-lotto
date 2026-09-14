"use server";

import HISTORICAL from "@/lib/data/historical.json";
import { runBacktest } from "@/lib/engine/backtest";
import type { BacktestComparisonReport } from "@/lib/types";

export async function getBacktestReport(): Promise<BacktestComparisonReport> {
  return runBacktest(HISTORICAL as any, {
    minHistoryWindow: 30,
  });
}
