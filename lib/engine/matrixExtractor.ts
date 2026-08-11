import Decimal from "decimal.js";
import { PI, E } from "./constants";
import type { DrawDate, MatrixResult } from "@/lib/types";

const TEN_TO_15 = new Decimal(10).pow(15);
const ONE_THIRD = new Decimal(1).div(3);

function pad(n: Decimal, len: number): string {
  return n.toString().padStart(len, "0");
}

export function extractMatrix(
  targetDate: DrawDate,
  X: Decimal,
  S_T: Decimal,
): MatrixResult {
  // 1. Prize1
  const prize = X.mul(PI).floor().mod(1_000_000);
  const firstPrize = pad(prize, 6);

  // 2. Adjacent (wrap mod 10^6)
  const p = prize.toNumber();
  const low = pad(new Decimal((p - 1 + 1_000_000) % 1_000_000), 6);
  const high = pad(new Decimal((p + 1) % 1_000_000), 6);

  // 3. Back-2
  const backTwo = pad(X.floor().mod(100), 2);

  // 4a. Front-3 set 1
  const front1 = pad(X.mul(TEN_TO_15).floor().mod(1000), 3);
  // 4b. Front-3 set 2
  const front2 = pad(X.mul(E).floor().mod(1000), 3);

  // 5a. Back-3 set 1
  const back1 = pad(X.sqrt().floor().mod(1000), 3);
  // 5b. Back-3 set 2
  const back2 = pad(X.pow(ONE_THIRD).floor().mod(1000), 3);

  // Tension score for display
  const tensionScore = S_T.mul(100).toDecimalPlaces(2).toNumber();

  return {
    targetDate,
    firstPrize,
    adjacent: [low, high],
    frontThree: [front1, front2],
    backThree: [back1, back2],
    backTwo,
    tensionScore,
  };
}
