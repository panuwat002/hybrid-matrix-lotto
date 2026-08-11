"use server";

import { calculateHybridMatrix } from "@/lib/engine";
import { isUnlocked } from "@/lib/session/unlock";
import { getClientIp, enforceRateLimit } from "./rateLimit";
import type { DrawDate, MatrixResult } from "@/lib/types";

export async function generateMatrix(
  targetDate: DrawDate,
): Promise<MatrixResult> {
  if (!isUnlocked()) throw new Error("UNLOCK_REQUIRED");
  enforceRateLimit(getClientIp());
  if (!/^\d{8}$/.test(targetDate)) throw new Error("INVALID_DATE");
  return calculateHybridMatrix(targetDate);
}
