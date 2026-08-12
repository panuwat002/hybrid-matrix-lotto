import "server-only";
import { headers } from "next/headers";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = 20;
const DEFAULT_BUCKET = "default";

// key = `${bucket}:${ip}`  →  timestamps
const requestLog = new Map<string, number[]>();

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  bucket?: string;
};

export function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export function enforceRateLimit(
  ip: string,
  opts: RateLimitOptions = {},
): void {
  const limit = opts.limit ?? DEFAULT_MAX_PER_WINDOW;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const bucket = opts.bucket ?? DEFAULT_BUCKET;
  const key = `${bucket}:${ip}`;

  const now = Date.now();
  const prior = requestLog.get(key) ?? [];
  const recent = prior.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    throw new Error("RATE_LIMITED");
  }
  recent.push(now);
  requestLog.set(key, recent);
}

/** Test-only reset — do not call from application code. */
export function __resetRateLimiterForTests(): void {
  requestLog.clear();
}
