import "server-only";
import { headers } from "next/headers";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

// In-memory per-warm-instance. Vercel serverless has multiple warm
// instances so this is a soft cap, not a strict one. For a strict
// cap use Vercel KV / @upstash/ratelimit. Documented in README.
const requestLog = new Map<string, number[]>();

export function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export function enforceRateLimit(ip: string): void {
  const now = Date.now();
  const prior = requestLog.get(ip) ?? [];
  const recent = prior.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    throw new Error("RATE_LIMITED");
  }
  recent.push(now);
  requestLog.set(ip, recent);
}

/** Test-only reset — do not call from application code. */
export function __resetRateLimiterForTests(): void {
  requestLog.clear();
}
