import { describe, it, expect } from "vitest";
import { runBacktest } from "@/lib/engine/backtest";
import HISTORICAL from "@/lib/data/historical.json";

describe("Backtest Engine", () => {
  it("throws error if draws count is less than minHistoryWindow", () => {
    expect(() => runBacktest([], { minHistoryWindow: 50 })).toThrow();
  });

  it("computes backtest report over historical draws", () => {
    const report = runBacktest(HISTORICAL as any, {
      minHistoryWindow: 30,
      maxTestDraws: 50,
    });

    expect(report.testedDrawsCount).toBe(50);
    expect(report.summaries["hybrid-matrix"]).toBeDefined();
    expect(report.summaries["adaptive-frequency"]).toBeDefined();

    const hybrid = report.summaries["hybrid-matrix"];
    expect(hybrid.metrics.totalDraws).toBe(50);
    expect(hybrid.rates.runningOneRate).toBeGreaterThanOrEqual(0);
    expect(hybrid.rates.runningOneRate).toBeLessThanOrEqual(100);
    expect(hybrid.rates.compositeScore).toBeGreaterThan(0);

    expect(report.winnerId).toBeDefined();
    expect(report.recommendation).toBeTruthy();
  });
});
