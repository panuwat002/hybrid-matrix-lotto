import Decimal from "decimal.js";
import { PHI, PI } from "./constants";
import type { DrawDate } from "@/lib/types";

export function cosmicMultiplier(targetDate: DrawDate, S_T: Decimal): Decimal {
  if (!/^\d+$/.test(targetDate)) {
    throw new Error(`cosmicMultiplier: invalid targetDate '${targetDate}'`);
  }
  const D = new Decimal(targetDate);
  return D.mul(S_T).mul(PHI.pow(3)).mul(PI);
}
