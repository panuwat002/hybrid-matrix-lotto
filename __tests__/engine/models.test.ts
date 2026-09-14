import { describe, it, expect } from "vitest";
import { calculateWithModel, AVAILABLE_MODELS } from "@/lib/engine/models";
import HISTORICAL from "@/lib/data/historical.json";

describe("Formula Models Engine", () => {
  it("registers both models properly", () => {
    expect(AVAILABLE_MODELS.length).toBe(2);
    expect(AVAILABLE_MODELS.map((m) => m.id)).toEqual([
      "hybrid-matrix",
      "adaptive-frequency",
    ]);
  });

  it("calculates deterministic result for hybrid-matrix", () => {
    const r1 = calculateWithModel("hybrid-matrix", "16082569", HISTORICAL as any);
    const r2 = calculateWithModel("hybrid-matrix", "16082569", HISTORICAL as any);
    expect(r1).toEqual(r2);
    expect(r1.firstPrize).toMatch(/^\d{6}$/);
    expect(r1.backTwo).toMatch(/^\d{2}$/);
    expect(r1.frontThree).toHaveLength(2);
    expect(r1.backThree).toHaveLength(2);
    expect(r1.adjacent).toHaveLength(2);
  });

  it("calculates deterministic result for adaptive-frequency", () => {
    const r1 = calculateWithModel("adaptive-frequency", "16082569", HISTORICAL as any);
    const r2 = calculateWithModel("adaptive-frequency", "16082569", HISTORICAL as any);
    expect(r1).toEqual(r2);
    expect(r1.firstPrize).toMatch(/^\d{6}$/);
    expect(r1.backTwo).toMatch(/^\d{2}$/);
    expect(r1.frontThree).toHaveLength(2);
    expect(r1.backThree).toHaveLength(2);
    expect(r1.adjacent).toHaveLength(2);
    expect(r1.modelId).toBe("adaptive-frequency");
  });
});
