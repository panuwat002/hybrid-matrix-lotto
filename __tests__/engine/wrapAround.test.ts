import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { extractMatrix } from "@/lib/engine/matrixExtractor";
import { PI } from "@/lib/engine/constants";

describe("adjacent wrap-around", () => {
  // ใช้ค่ากลาง (0.5) เพื่อกัน round-trip error จาก div/mul precision 50:
  //   X = 1_000_000.5 / π  →  X × π ≈ 1_000_000.5  →  floor = 1_000_000  →  mod 10^6 = 0
  //   X = 999_999.5 / π    →  X × π ≈ 999_999.5    →  floor = 999_999    →  mod 10^6 = 999_999
  const X_zero = new Decimal("1000000.5").div(PI);
  const X_max = new Decimal("999999.5").div(PI);

  it("Prize1 = 000000 → adjacent = [999999, 000001]", () => {
    const r = extractMatrix("00000000", X_zero, new Decimal("0"));
    expect(r.firstPrize).toBe("000000");
    expect(r.adjacent).toEqual(["999999", "000001"]);
  });

  it("Prize1 = 999999 → adjacent = [999998, 000000]", () => {
    const r = extractMatrix("00000000", X_max, new Decimal("0"));
    expect(r.firstPrize).toBe("999999");
    expect(r.adjacent).toEqual(["999998", "000000"]);
  });
});
