import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { cosmicMultiplier } from "@/lib/engine/cosmicMultiplier";
import { PHI, PI } from "@/lib/engine/constants";

describe("cosmicMultiplier", () => {
  it("returns Decimal", () => {
    const X = cosmicMultiplier("16082569", new Decimal("0.5"));
    expect(X).toBeInstanceOf(Decimal);
  });

  it("matches formula X = (D × S_T) × φ³ × π", () => {
    const D = new Decimal("16082569");
    const S_T = new Decimal("0.5");
    const expected = D.mul(S_T).mul(PHI.pow(3)).mul(PI);
    const got = cosmicMultiplier("16082569", S_T);
    expect(got.toString()).toBe(expected.toString());
  });

  it("deterministic — same input → same X", () => {
    const S_T = new Decimal("0.123");
    const a = cosmicMultiplier("01012570", S_T);
    const b = cosmicMultiplier("01012570", S_T);
    expect(a.toString()).toBe(b.toString());
  });

  it("throws on invalid date format", () => {
    expect(() => cosmicMultiplier("abc", new Decimal("0.5"))).toThrow();
    expect(() => cosmicMultiplier("", new Decimal("0.5"))).toThrow();
  });

  it("preserves precision (>40 significant digits)", () => {
    const X = cosmicMultiplier("16082569", new Decimal("0.5"));
    const s = X.toString().replace(".", "").replace(/^0+/, "");
    expect(s.length).toBeGreaterThanOrEqual(40);
  });
});
