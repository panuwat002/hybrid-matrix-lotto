import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieValue = { current: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "lotto_unlock" && mockCookieValue.current
        ? { value: mockCookieValue.current }
        : undefined,
    set: () => {},
  }),
  headers: () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));

// Import AFTER mock
import { generateMatrix } from "@/lib/actions/generateMatrix";
import { __resetRateLimiterForTests } from "@/lib/actions/rateLimit";

describe("generateMatrix action", () => {
  beforeEach(() => {
    mockCookieValue.current = undefined;
    __resetRateLimiterForTests();
  });

  it("throws UNLOCK_REQUIRED when cookie missing", async () => {
    await expect(generateMatrix("16082569")).rejects.toThrow("UNLOCK_REQUIRED");
  });

  it("throws INVALID_DATE for bad format", async () => {
    mockCookieValue.current = "1";
    await expect(generateMatrix("bad")).rejects.toThrow("INVALID_DATE");
    await expect(generateMatrix("1234567")).rejects.toThrow("INVALID_DATE");
    await expect(generateMatrix("123456789")).rejects.toThrow("INVALID_DATE");
  });

  it("returns MatrixResult when unlocked and valid", async () => {
    mockCookieValue.current = "1";
    const r = await generateMatrix("16082569");
    expect(r.targetDate).toBe("16082569");
    expect(r.firstPrize).toMatch(/^\d{6}$/);
  });

  it("throws RATE_LIMITED after 20 requests in 60s", async () => {
    mockCookieValue.current = "1";
    for (let i = 0; i < 20; i++) {
      await generateMatrix("16082569");
    }
    await expect(generateMatrix("16082569")).rejects.toThrow("RATE_LIMITED");
  });
});
