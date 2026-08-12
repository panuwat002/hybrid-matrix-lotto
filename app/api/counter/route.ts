import { NextResponse } from "next/server";
import { readTotal, incrementTotal } from "@/lib/analytics/upstash";
import { enforceRateLimit, getClientIp } from "@/lib/actions/rateLimit";

export async function GET() {
  const total = await readTotal();
  if (total === null) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ total });
}

export async function POST() {
  try {
    enforceRateLimit(getClientIp(), {
      limit: 5,
      windowMs: 60_000,
      bucket: "counter",
    });
  } catch {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const total = await incrementTotal();
  if (total === null) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ total });
}
