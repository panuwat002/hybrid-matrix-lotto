import { describe, it, expect } from "vitest";
import { calculateHybridMatrix } from "@/lib/engine";
import type { DrawDate } from "@/lib/types";

// ⭐ Golden Snapshot — ค่า expected จะถูกล็อกหลัง run แรก
// ถ้ามีคนแก้ engine แล้วผลเปลี่ยน → test fail
const CASES: DrawDate[] = [
  "01012567",
  "16032568",
  "01072568",
  "16082569",
  "01012570",
];

describe("determinism (golden snapshot)", () => {
  it.each(CASES)("matrix for %s is stable", (date) => {
    const first = calculateHybridMatrix(date);
    const second = calculateHybridMatrix(date);
    expect(second).toEqual(first);
  });

  it("full snapshot for 16082569 stays stable", () => {
    const r = calculateHybridMatrix("16082569");
    expect(r).toMatchSnapshot();
  });

  it("shapes are valid", () => {
    for (const d of CASES) {
      const r = calculateHybridMatrix(d);
      expect(r.firstPrize).toMatch(/^\d{6}$/);
      expect(r.adjacent[0]).toMatch(/^\d{6}$/);
      expect(r.adjacent[1]).toMatch(/^\d{6}$/);
      expect(r.frontThree[0]).toMatch(/^\d{3}$/);
      expect(r.frontThree[1]).toMatch(/^\d{3}$/);
      expect(r.backThree[0]).toMatch(/^\d{3}$/);
      expect(r.backThree[1]).toMatch(/^\d{3}$/);
      expect(r.backTwo).toMatch(/^\d{2}$/);
      expect(r.tensionScore).toBeGreaterThanOrEqual(0);
      expect(r.tensionScore).toBeLessThanOrEqual(100);
    }
  });
});
