import type { DrawDate, MatrixResult } from "@/lib/types";
import HISTORICAL from "@/lib/data/historical.json";
import { computeStatisticalTension } from "./statisticalTension";
import { cosmicMultiplier } from "./cosmicMultiplier";
import { extractMatrix } from "./matrixExtractor";

export function calculateHybridMatrix(targetDate: DrawDate): MatrixResult {
  const S_T = computeStatisticalTension(HISTORICAL);
  const X = cosmicMultiplier(targetDate, S_T);
  return extractMatrix(targetDate, X, S_T);
}
