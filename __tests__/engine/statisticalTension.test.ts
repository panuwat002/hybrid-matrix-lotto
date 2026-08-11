import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeStatisticalTension } from "@/lib/engine/statisticalTension";
import type { HistoricalDraw } from "@/lib/types";

describe("computeStatisticalTension", () => {
  it("returns Decimal in [0, 1)", () => {
    const draws: HistoricalDraw[] = [
      { date: "01012567", firstPrize: "123456" },
      { date: "16012567", firstPrize: "789012" },
      { date: "01022567", firstPrize: "345678" },
    ];
    const s = computeStatisticalTension(draws);
    expect(s).toBeInstanceOf(Decimal);
    expect(s.gte(0)).toBe(true);
    expect(s.lt(1)).toBe(true);
  });

  it("deterministic — same input → same output", () => {
    const draws: HistoricalDraw[] = [
      { date: "01012567", firstPrize: "111222" },
      { date: "16012567", firstPrize: "333444" },
    ];
    const a = computeStatisticalTension(draws);
    const b = computeStatisticalTension(draws);
    expect(a.toString()).toBe(b.toString());
  });

  it("concatenates top-3 tension digits (fixed dataset)", () => {
    // 5 draws, 30 digit slots
    const draws: HistoricalDraw[] = [
      { date: "d1", firstPrize: "000000" }, // 0×6
      { date: "d2", firstPrize: "000000" }, // 0×6
      { date: "d3", firstPrize: "111111" }, // 1×6
      { date: "d4", firstPrize: "222222" }, // 2×6
      { date: "d5", firstPrize: "333333" }, // 3×6
    ];
    // freq: 0→12, 1→6, 2→6, 3→6, 4-9→0
    // mean = 30/10 = 3
    // gap (from latest d5 back): 3=0, 2=1, 1=2, 0=3, 4-9=5 (never appeared → len)
    // tension[d] = (freq-3)² × (gap+1)
    //   0: 81 × 4 = 324
    //   1: 9 × 3 = 27
    //   2: 9 × 2 = 18
    //   3: 9 × 1 = 9
    //   4-9: 9 × 6 = 54  (freq=0, gap=5)
    // top-3 by tension desc, digit asc as tie-break:
    //   0 (324), then digits 4..9 all tied at 54 → pick 4 first, 5 next
    //   → concat "045" → T = 45 → S_T = 0.045
    const s = computeStatisticalTension(draws);
    expect(s.toString()).toBe("0.045");
  });

  it("throws when draws array is empty", () => {
    expect(() => computeStatisticalTension([])).toThrow();
  });
});
