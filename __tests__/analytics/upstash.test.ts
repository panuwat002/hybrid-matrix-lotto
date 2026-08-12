import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGet = vi.fn();
const mockIncr = vi.fn();
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: mockGet,
    incr: mockIncr,
  })),
}));

describe("upstash analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGet.mockReset();
    mockIncr.mockReset();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("readTotal returns null when env vars missing", async () => {
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBeNull();
  });

  it("incrementTotal returns null when env vars missing", async () => {
    const { incrementTotal } = await import("@/lib/analytics/upstash");
    expect(await incrementTotal()).toBeNull();
  });

  it("readTotal returns 0 when key not set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockGet.mockResolvedValueOnce(null);
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBe(0);
    expect(mockGet).toHaveBeenCalledWith("hybrid-matrix:visits:total");
  });

  it("readTotal returns stored integer", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockGet.mockResolvedValueOnce(42);
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBe(42);
  });

  it("incrementTotal returns new total", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockIncr.mockResolvedValueOnce(43);
    const { incrementTotal } = await import("@/lib/analytics/upstash");
    expect(await incrementTotal()).toBe(43);
    expect(mockIncr).toHaveBeenCalledWith("hybrid-matrix:visits:total");
  });

  it("readTotal returns null on Redis error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockGet.mockRejectedValueOnce(new Error("network"));
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBeNull();
  });

  it("incrementTotal returns null on Redis error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockIncr.mockRejectedValueOnce(new Error("network"));
    const { incrementTotal } = await import("@/lib/analytics/upstash");
    expect(await incrementTotal()).toBeNull();
  });
});
