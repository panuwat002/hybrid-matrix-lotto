import { describe, it, expect } from "vitest";
import { calculateWithModel, AVAILABLE_MODELS } from "@/lib/engine/models";
import HISTORICAL from "@/lib/data/historical.json";

describe("Formula Models Engine", () => {
  it("registers all models properly", () => {
    expect(AVAILABLE_MODELS.length).toBe(3);
    expect(AVAILABLE_MODELS.map((m) => m.id)).toEqual([
      "hybrid-matrix",
      "adaptive-frequency",
      "statistical-boost",
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

  it("calculates deterministic result for statistical-boost", () => {
    const r1 = calculateWithModel("statistical-boost", "16082569", HISTORICAL as any);
    const r2 = calculateWithModel("statistical-boost", "16082569", HISTORICAL as any);
    expect(r1).toEqual(r2);
    expect(r1.firstPrize).toMatch(/^\d{6}$/);
    expect(r1.backTwo).toMatch(/^\d{2}$/);
    expect(r1.frontThree).toHaveLength(2);
    expect(r1.backThree).toHaveLength(2);
    expect(r1.adjacent).toHaveLength(2);
    expect(r1.modelId).toBe("statistical-boost");
    expect(r1.candidates).toBeDefined();
    expect(r1.candidates!.length).toBe(9);
    r1.candidates!.forEach((c) => {
      expect(c).toMatch(/^\d{6}$/);
    });
  });
});


describe("Statistical Boost — back-two coverage set", () => {
  const result = () =>
    calculateWithModel("statistical-boost", "16082569", HISTORICAL as any);

  it("exposes a backTwoSet of two-digit strings", () => {
    const r = result();
    expect(r.backTwoSet).toBeDefined();
    expect(r.backTwoSet!.length).toBeGreaterThan(0);
    r.backTwoSet!.forEach((p) => expect(p).toMatch(/^\d{2}$/));
  });

  it("leads the set with the headline backTwo", () => {
    const r = result();
    expect(r.backTwoSet![0]).toBe(r.backTwo);
  });

  it("contains no duplicate pairs", () => {
    const set = result().backTwoSet!;
    expect(new Set(set).size).toBe(set.length);
  });

  it("includes the reversed form of every non-palindrome pair it ranks", () => {
    const set = result().backTwoSet!;
    const ranked = set.filter((p) => p[0] !== p[1]);
    expect(ranked.length).toBeGreaterThan(0);
    ranked.forEach((p) => {
      const reversed = `${p[1]}${p[0]}`;
      expect(set).toContain(reversed);
    });
  });

  it("produces an identical set on repeated calls", () => {
    const a = result().backTwoSet!;
    const b = result().backTwoSet!;
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it("offers nine extra first-prize candidates", () => {
    const r = result();
    expect(r.candidates!.length).toBe(9);
  });
});
