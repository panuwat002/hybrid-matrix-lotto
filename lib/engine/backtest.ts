import "server-only";
import type {
  BacktestComparisonReport,
  FormulaModelId,
  HistoricalDraw,
  HitCategoryCount,
  ModelBacktestSummary,
} from "@/lib/types";
import { AVAILABLE_MODELS, calculateWithModel } from "./models";

export function runBacktest(
  draws: HistoricalDraw[],
  options?: {
    minHistoryWindow?: number;
    maxTestDraws?: number;
  },
): BacktestComparisonReport {
  const minHistory = options?.minHistoryWindow ?? 40;
  if (draws.length <= minHistory) {
    throw new Error(
      `runBacktest: draws count (${draws.length}) must be greater than minHistoryWindow (${minHistory})`,
    );
  }

  const startIndex = minHistory;
  const endIndex = options?.maxTestDraws
    ? Math.min(draws.length, startIndex + options.maxTestDraws)
    : draws.length;

  const testDraws = draws.slice(startIndex, endIndex);
  const totalTestCount = testDraws.length;

  const models: FormulaModelId[] = ["hybrid-matrix", "adaptive-frequency", "statistical-boost"];

  const initialCounts = (): HitCategoryCount => ({
    totalDraws: totalTestCount,
    firstPrizeExact: 0,
    adjacentHits: 0,
    backTwoExact: 0,
    backTwoReversedHits: 0,
    backTwoSetHits: 0,
    topTwoExact: 0,
    frontThreeHits: 0,
    backThreeHits: 0,
    runningOneHits: 0,
    runningTwoHits: 0,
  });

  const modelCounts: Record<FormulaModelId, HitCategoryCount> = {
    "hybrid-matrix": initialCounts(),
    "adaptive-frequency": initialCounts(),
    "statistical-boost": initialCounts(),
  };

  // Track candidate hits for statistical-boost
  let candidateFirstPrizeHits = 0;

  // Accumulated size of each model's back-two coverage set, for the chance baseline
  const setSizeTotals: Record<FormulaModelId, number> = {
    "hybrid-matrix": 0,
    "adaptive-frequency": 0,
    "statistical-boost": 0,
  };

  for (let i = startIndex; i < endIndex; i++) {
    const actual = draws[i];
    const historicalSnapshot = draws.slice(0, i); // Strictly prevent lookahead bias

    const actualFirst = actual.firstPrize;
    const actualTwo = actual.twoDigits ?? actualFirst.slice(-2);
    const actualTopTwo = actualFirst.slice(-2);
    const actualFront3 = actual.threeFront && actual.threeFront.length > 0
      ? actual.threeFront
      : [actualFirst.slice(0, 3)];
    const actualBack3 = actual.threeBack && actual.threeBack.length > 0
      ? actual.threeBack
      : [actualFirst.slice(-3)];
    const actualNear = actual.nearFirst && actual.nearFirst.length > 0
      ? actual.nearFirst
      : [
          String((Number(actualFirst) - 1 + 1_000_000) % 1_000_000).padStart(6, "0"),
          String((Number(actualFirst) + 1) % 1_000_000).padStart(6, "0"),
        ];

    for (const modelId of models) {
      const pred = calculateWithModel(modelId, actual.date, historicalSnapshot);
      const counts = modelCounts[modelId];

      // 1. Exact 1st prize
      if (pred.firstPrize === actualFirst) {
        counts.firstPrizeExact++;
      }

      // 2. Adjacent 1st prize
      if (
        actualNear.includes(pred.firstPrize) ||
        pred.adjacent.includes(actualFirst)
      ) {
        counts.adjacentHits++;
      }

      // 3. 2-digit bottom (2 ตัวล่าง)
      if (pred.backTwo === actualTwo) {
        counts.backTwoExact++;
      }

      // 3b. Reversed headline pair (เลขกลับ) — tracked apart from an exact hit
      if (`${pred.backTwo[1]}${pred.backTwo[0]}` === actualTwo) {
        counts.backTwoReversedHits++;
      }

      // 3c. Coverage set. A model that ships no set covers exactly one pair,
      // so its set rate collapses onto its exact rate and its baseline is 1%.
      const coverageSet =
        pred.backTwoSet && pred.backTwoSet.length > 0
          ? pred.backTwoSet
          : [pred.backTwo];
      setSizeTotals[modelId] += coverageSet.length;
      if (coverageSet.includes(actualTwo)) {
        counts.backTwoSetHits++;
      }

      // 4. 2-digit top (2 ตัวบน)
      if (pred.backTwo === actualTopTwo) {
        counts.topTwoExact++;
      }

      // 5. 3-digit front
      if (
        actualFront3.includes(pred.frontThree[0]) ||
        actualFront3.includes(pred.frontThree[1])
      ) {
        counts.frontThreeHits++;
      }

      // 6. 3-digit back
      if (
        actualBack3.includes(pred.backThree[0]) ||
        actualBack3.includes(pred.backThree[1])
      ) {
        counts.backThreeHits++;
      }

      // 7. Running 1-digit
      const d1 = pred.backTwo[0];
      const d2 = pred.backTwo[1];
      if (
        actualFirst.includes(d1) ||
        actualFirst.includes(d2) ||
        actualTwo.includes(d1) ||
        actualTwo.includes(d2)
      ) {
        counts.runningOneHits++;
      }

      // 8. Running 2-digit
      if (actualFirst.includes(d1) && actualFirst.includes(d2)) {
        counts.runningTwoHits++;
      }
    }
  }

  // Compute rates and summaries
  const summaries: Record<FormulaModelId, ModelBacktestSummary> = {} as any;
  let winnerId: FormulaModelId = "hybrid-matrix";
  let highestComposite = -1;

  for (const modelId of models) {
    const c = modelCounts[modelId];
    const n = Math.max(1, totalTestCount);

    const backTwoRate = Number(((c.backTwoExact / n) * 100).toFixed(2));
    const backTwoReversedRate = Number(
      ((c.backTwoReversedHits / n) * 100).toFixed(2),
    );
    const backTwoSetRate = Number(((c.backTwoSetHits / n) * 100).toFixed(2));
    // A set of k pairs covers k/100 of the space for free. Report that alongside
    // the set rate so a wider net never reads as a sharper model.
    const backTwoSetBaselineRate = Number(
      ((setSizeTotals[modelId] / n) * 1).toFixed(2),
    );
    const topTwoRate = Number(((c.topTwoExact / n) * 100).toFixed(2));
    const frontThreeRate = Number(((c.frontThreeHits / n) * 100).toFixed(2));
    const backThreeRate = Number(((c.backThreeHits / n) * 100).toFixed(2));
    const runningOneRate = Number(((c.runningOneHits / n) * 100).toFixed(2));
    const runningTwoRate = Number(((c.runningTwoHits / n) * 100).toFixed(2));

    // Composite score (100-point scale)
    const compositeScore = Number(
      (
        backTwoRate * 3.0 +
        topTwoRate * 2.5 +
        frontThreeRate * 2.0 +
        backThreeRate * 2.0 +
        runningOneRate * 0.4 +
        runningTwoRate * 0.6
      ).toFixed(2),
    );

    const modelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId);

    summaries[modelId] = {
      modelId,
      modelName: modelInfo?.name ?? modelId,
      metrics: c,
      rates: {
        backTwoRate,
        backTwoReversedRate,
        backTwoSetRate,
        backTwoSetBaselineRate,
        topTwoRate,
        frontThreeRate,
        backThreeRate,
        runningOneRate,
        runningTwoRate,
        compositeScore,
      },
    };

    if (compositeScore > highestComposite) {
      highestComposite = compositeScore;
      winnerId = modelId;
    }
  }

  const startDate = testDraws[0]?.date ?? "";
  const endDate = testDraws[testDraws.length - 1]?.date ?? "";

  const recommendation =
    winnerId === "adaptive-frequency"
      ? "โมเดล Adaptive Frequency มีอัตราเข้าเป้าสถิติรวมสูงกว่า โดยเฉพาะในหมวดเลขท้าย 2 ตัวและเลขวิ่ง แนะนำให้ใช้เป็นสูตรทางเลือกสำหรับผู้ที่เน้นสถิติความถี่"
      : "โมเดล Hybrid Matrix (Deterministic φ³) ยังคงให้ค่ากระจายตัวของตัวเลขที่สม่ำเสมอและมีเอกลักษณ์สูง เหมาะเป็นสูตรหลัก";

  return {
    testedDrawsCount: totalTestCount,
    startDate,
    endDate,
    summaries,
    winnerId,
    recommendation,
  };
}
