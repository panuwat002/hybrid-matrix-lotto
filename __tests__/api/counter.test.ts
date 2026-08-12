import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockReadTotal, mockIncrementTotal } = vi.hoisted(() => ({
  mockReadTotal: vi.fn(),
  mockIncrementTotal: vi.fn(),
}));

vi.mock("@/lib/analytics/upstash", () => ({
  readTotal: mockReadTotal,
  incrementTotal: mockIncrementTotal,
}));

vi.mock("next/headers", () => ({
  headers: () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));

import { GET, POST } from "@/app/api/counter/route";
import { __resetRateLimiterForTests } from "@/lib/actions/rateLimit";

describe("/api/counter", () => {
  beforeEach(() => {
    mockReadTotal.mockReset();
    mockIncrementTotal.mockReset();
    __resetRateLimiterForTests();
  });

  it("GET returns total from upstash", async () => {
    mockReadTotal.mockResolvedValueOnce(123);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ total: 123 });
  });

  it("GET returns 503 when upstash returns null", async () => {
    mockReadTotal.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("POST increments and returns new total", async () => {
    mockIncrementTotal.mockResolvedValueOnce(124);
    const res = await POST();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ total: 124 });
  });

  it("POST returns 429 after 5 hits from same IP", async () => {
    mockIncrementTotal.mockResolvedValue(100);
    for (let i = 0; i < 5; i++) {
      const r = await POST();
      expect(r.status).toBe(200);
    }
    const res = await POST();
    expect(res.status).toBe(429);
  });

  it("POST returns 503 when upstash returns null", async () => {
    mockIncrementTotal.mockResolvedValueOnce(null);
    const res = await POST();
    expect(res.status).toBe(503);
  });
});
