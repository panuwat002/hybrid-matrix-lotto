import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { PHI, PI, E, DECIMAL_PRECISION } from "@/lib/engine/constants";

describe("engine constants", () => {
  it("precision is set to 50", () => {
    expect(DECIMAL_PRECISION).toBe(50);
    expect(Decimal.precision).toBe(50);
  });

  it("PHI matches golden ratio to 50 digits", () => {
    expect(PHI.toString()).toBe(
      "1.6180339887498948482045868343656381177203091798058",
    );
  });

  it("PI matches to 50 digits", () => {
    expect(PI.toString()).toBe(
      "3.1415926535897932384626433832795028841971693993751",
    );
  });

  it("E matches to 50 digits", () => {
    expect(E.toString()).toBe(
      "2.7182818284590452353602874713526624977572470937",
    );
  });

  it("all constants are Decimal instances", () => {
    expect(PHI).toBeInstanceOf(Decimal);
    expect(PI).toBeInstanceOf(Decimal);
    expect(E).toBeInstanceOf(Decimal);
  });
});
