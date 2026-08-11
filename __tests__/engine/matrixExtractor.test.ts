import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { extractMatrix } from "@/lib/engine/matrixExtractor";
import { PI, E } from "@/lib/engine/constants";

describe("extractMatrix", () => {
  const X = new Decimal("123456789.987654321098765432109876");
  const S_T = new Decimal("0.5");
  const result = extractMatrix("16082569", X, S_T);

  it("returns MatrixResult with target date echoed", () => {
    expect(result.targetDate).toBe("16082569");
  });

  it("firstPrize = floor(X × π) mod 10^6, zero-padded to 6 chars", () => {
    const expected = X.mul(PI).floor().mod(1_000_000).toString().padStart(6, "0");
    expect(result.firstPrize).toBe(expected);
    expect(result.firstPrize).toHaveLength(6);
  });

  it("adjacent = [prize-1 wrap, prize+1 wrap], zero-padded", () => {
    const prize = Number(result.firstPrize);
    const low = ((prize - 1 + 1_000_000) % 1_000_000).toString().padStart(6, "0");
    const high = ((prize + 1) % 1_000_000).toString().padStart(6, "0");
    expect(result.adjacent).toEqual([low, high]);
  });

  it("backTwo = floor(X) mod 100, 2-digit zero-padded", () => {
    const expected = X.floor().mod(100).toString().padStart(2, "0");
    expect(result.backTwo).toBe(expected);
    expect(result.backTwo).toHaveLength(2);
  });

  it("frontThree[0] = floor(X × 10^15) mod 1000, 3-digit padded", () => {
    const expected = X.mul(new Decimal(10).pow(15)).floor().mod(1000).toString().padStart(3, "0");
    expect(result.frontThree[0]).toBe(expected);
    expect(result.frontThree[0]).toHaveLength(3);
  });

  it("frontThree[1] = floor(X × e) mod 1000, 3-digit padded", () => {
    const expected = X.mul(E).floor().mod(1000).toString().padStart(3, "0");
    expect(result.frontThree[1]).toBe(expected);
  });

  it("backThree[0] = floor(sqrt(X)) mod 1000, 3-digit padded", () => {
    const expected = X.sqrt().floor().mod(1000).toString().padStart(3, "0");
    expect(result.backThree[0]).toBe(expected);
  });

  it("backThree[1] = floor(X^(1/3)) mod 1000, 3-digit padded", () => {
    const expected = X.pow(new Decimal(1).div(3)).floor().mod(1000).toString().padStart(3, "0");
    expect(result.backThree[1]).toBe(expected);
  });

  it("tensionScore = S_T × 100, 2 decimal places", () => {
    const r = extractMatrix("16082569", X, new Decimal("0.4215"));
    expect(r.tensionScore).toBe(42.15);
  });

  it("tensionScore in [0, 100]", () => {
    expect(result.tensionScore).toBeGreaterThanOrEqual(0);
    expect(result.tensionScore).toBeLessThanOrEqual(100);
  });
});
