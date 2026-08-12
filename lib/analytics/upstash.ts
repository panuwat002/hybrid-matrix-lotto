import "server-only";
import { Redis } from "@upstash/redis";

const TOTAL_KEY = "hybrid-matrix:visits:total";

let cached: Redis | null = null;
function client(): Redis | null {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cached = new Redis({ url, token });
  return cached;
}

export async function readTotal(): Promise<number | null> {
  const c = client();
  if (!c) return null;
  try {
    const v = await c.get<number>(TOTAL_KEY);
    return v ?? 0;
  } catch {
    return null;
  }
}

export async function incrementTotal(): Promise<number | null> {
  const c = client();
  if (!c) return null;
  try {
    return await c.incr(TOTAL_KEY);
  } catch {
    return null;
  }
}
