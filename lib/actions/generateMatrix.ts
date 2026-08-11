"use server";

import { calculateHybridMatrix } from "@/lib/engine";
import { isUnlocked } from "@/lib/session/unlock";
import type { DrawDate, MatrixResult } from "@/lib/types";

export async function generateMatrix(
  targetDate: DrawDate,
): Promise<MatrixResult> {
  if (!isUnlocked()) {
    throw new Error("UNLOCK_REQUIRED");
  }
  if (!/^\d{8}$/.test(targetDate)) {
    throw new Error("INVALID_DATE");
  }
  return calculateHybridMatrix(targetDate);
}
