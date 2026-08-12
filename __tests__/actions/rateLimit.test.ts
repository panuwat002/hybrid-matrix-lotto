import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));

import {
  enforceRateLimit,
  __resetRateLimiterForTests,
} from "@/lib/actions/rateLimit";

describe("enforceRateLimit", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    vi.useFakeTimers();
  });

  it("allows up to 20 requests per minute per IP", () => {
    for (let i = 0; i < 20; i++) {
      expect(() => enforceRateLimit("1.2.3.4")).not.toThrow();
    }
  });

  it("rejects the 21st request within 60 seconds", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("1.2.3.4")).toThrow("RATE_LIMITED");
  });

  it("isolates per IP", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("5.6.7.8")).not.toThrow();
  });

  it("recovers after the window elapses", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("1.2.3.4")).toThrow();
    vi.advanceTimersByTime(60_001);
    expect(() => enforceRateLimit("1.2.3.4")).not.toThrow();
  });

  it("isolates per bucket — same IP different bucket", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("1.2.3.4")).toThrow("RATE_LIMITED");
    expect(() =>
      enforceRateLimit("1.2.3.4", { bucket: "counter" }),
    ).not.toThrow();
  });

  it("respects custom limit override", () => {
    for (let i = 0; i < 5; i++) {
      enforceRateLimit("1.2.3.4", { limit: 5, bucket: "counter" });
    }
    expect(() =>
      enforceRateLimit("1.2.3.4", { limit: 5, bucket: "counter" }),
    ).toThrow("RATE_LIMITED");
  });

  it("respects custom windowMs override", () => {
    enforceRateLimit("1.2.3.4", { limit: 1, windowMs: 5000, bucket: "short" });
    expect(() =>
      enforceRateLimit("1.2.3.4", { limit: 1, windowMs: 5000, bucket: "short" }),
    ).toThrow();
    vi.advanceTimersByTime(5001);
    expect(() =>
      enforceRateLimit("1.2.3.4", { limit: 1, windowMs: 5000, bucket: "short" }),
    ).not.toThrow();
  });
});
