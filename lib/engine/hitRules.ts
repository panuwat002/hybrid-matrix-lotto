import "server-only";
import type { HistoricalDraw, MatrixResult, ModelScore } from "@/lib/types";

/**
 * A published draw with every prize filled in. Older archive rows carry only
 * `firstPrize`, so the missing prizes fall back to slices of it.
 */
export type ActualDraw = {
  firstPrize: string;
  twoDigits: string;
  topTwo: string;
  frontThree: string[];
  backThree: string[];
  nearFirst: string[];
};

export function normalizeDraw(draw: HistoricalDraw): ActualDraw {
  const first = draw.firstPrize;
  return {
    firstPrize: first,
    twoDigits: draw.twoDigits ?? first.slice(-2),
    topTwo: first.slice(-2),
    frontThree:
      draw.threeFront && draw.threeFront.length > 0
        ? draw.threeFront
        : [first.slice(0, 3)],
    backThree:
      draw.threeBack && draw.threeBack.length > 0
        ? draw.threeBack
        : [first.slice(-3)],
    nearFirst:
      draw.nearFirst && draw.nearFirst.length > 0
        ? draw.nearFirst
        : [
            String((Number(first) - 1 + 1_000_000) % 1_000_000).padStart(6, "0"),
            String((Number(first) + 1) % 1_000_000).padStart(6, "0"),
          ],
  };
}

/**
 * A model that ships no coverage set plays exactly one pair, so its set hit
 * collapses onto its exact hit and its coverage size is 1.
 */
export function coverageSetOf(pred: MatrixResult): string[] {
  return pred.backTwoSet && pred.backTwoSet.length > 0
    ? pred.backTwoSet
    : [pred.backTwo];
}

export function scorePrediction(
  pred: MatrixResult,
  actual: ActualDraw,
): ModelScore {
  const coverage = coverageSetOf(pred);
  const [d1, d2] = [pred.backTwo[0], pred.backTwo[1]];

  return {
    firstPrizeExact: pred.firstPrize === actual.firstPrize,
    adjacentHit:
      actual.nearFirst.includes(pred.firstPrize) ||
      pred.adjacent.includes(actual.firstPrize),
    backTwoExact: pred.backTwo === actual.twoDigits,
    backTwoReversed: `${d2}${d1}` === actual.twoDigits,
    backTwoSetHit: coverage.includes(actual.twoDigits),
    coverageSize: coverage.length,
    topTwoExact: pred.backTwo === actual.topTwo,
    frontThreeHit: pred.frontThree.some((n) => actual.frontThree.includes(n)),
    backThreeHit: pred.backThree.some((n) => actual.backThree.includes(n)),
    runningOneHit:
      actual.firstPrize.includes(d1) ||
      actual.firstPrize.includes(d2) ||
      actual.twoDigits.includes(d1) ||
      actual.twoDigits.includes(d2),
    runningTwoHit:
      actual.firstPrize.includes(d1) && actual.firstPrize.includes(d2),
  };
}
