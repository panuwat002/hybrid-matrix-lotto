"use server";

import { calculateWithModel } from "@/lib/engine/models";
import { isUnlocked } from "@/lib/session/unlock";
import { getClientIp, enforceRateLimit } from "./rateLimit";
import type { DrawDate, FormulaModelId, MatrixResult } from "@/lib/types";

export async function generateMatrix(
  targetDate: DrawDate,
  modelId: FormulaModelId = "hybrid-matrix",
): Promise<MatrixResult> {
  if (!isUnlocked()) throw new Error("UNLOCK_REQUIRED");
  enforceRateLimit(getClientIp());
  if (!/^\d{8}$/.test(targetDate)) throw new Error("INVALID_DATE");
  return calculateWithModel(modelId, targetDate);
}
