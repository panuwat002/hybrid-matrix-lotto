import "server-only";
import { Redis } from "@upstash/redis";

const TOTAL_KEY = "hybrid-matrix:visits:total";

let cached: Redis | null = null;
let clientInitFailed = false;

function client(): Redis | null {
  if (cached) return cached;
  if (clientInitFailed) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    cached = new Redis({ url, token });
    return cached;
  } catch {
    clientInitFailed = true;
    return null;
  }
}

export async function readTotal(): Promise<number | null> {
  let c: Redis | null;
  try {
    c = client();
  } catch {
    return null;
  }
  if (!c) return null;
  try {
    const v = await c.get<number>(TOTAL_KEY);
    return v ?? 0;
  } catch {
    return null;
  }
}

export async function incrementTotal(): Promise<number | null> {
  let c: Redis | null;
  try {
    c = client();
  } catch {
    return null;
  }
  if (!c) return null;
  try {
    return await c.incr(TOTAL_KEY);
  } catch {
    return null;
  }
}
