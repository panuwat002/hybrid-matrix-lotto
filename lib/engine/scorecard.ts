import "server-only";
import type {
  DrawScore,
  FormulaModelId,
  HistoricalDraw,
  ModelScore,
  RecordedPrediction,
  Scorecard,
  ScorecardTotals,
} from "@/lib/types";
import { normalizeDraw, scorePrediction } from "./hitRules";

const MODEL_IDS: FormulaModelId[] = [
  "hybrid-matrix",
  "adaptive-frequency",
  "statistical-boost",
];

/** "16082569" (DDMMYYYY BE) → 25690816, so draws sort chronologically. */
function sortKey(date: string): number {
  if (!/^\d{8}$/.test(date)) return 0;
  return Number(`${date.slice(4, 8)}${date.slice(2, 4)}${date.slice(0, 2)}`);
}

const emptyTotals = (): ScorecardTotals => ({
  drawsScored: 0,
  firstPrizeExact: 0,
  adjacentHits: 0,
  backTwoExact: 0,
  backTwoReversed: 0,
  backTwoSetHits: 0,
  frontThreeHits: 0,
  backThreeHits: 0,
  backTwoSetBaselineRate: 0,
});

/**
 * Score the recorded predictions against the published archive.
 *
 * Only draws that appear in both lists count toward the totals: a recorded
 * draw whose result is not out yet is shown as pending and scored as nothing,
 * so a fresh row can never flatter or dent the running record.
 */
export function buildScorecard(
  predictions: RecordedPrediction[],
  draws: HistoricalDraw[],
): Scorecard {
  const byDate = new Map(draws.map((d) => [d.date, d]));

  const totals: Record<FormulaModelId, ScorecardTotals> = {
    "hybrid-matrix": emptyTotals(),
    "adaptive-frequency": emptyTotals(),
    "statistical-boost": emptyTotals(),
  };
  const coverageTotals: Record<FormulaModelId, number> = {
    "hybrid-matrix": 0,
    "adaptive-frequency": 0,
    "statistical-boost": 0,
  };

  const rows: DrawScore[] = [...predictions]
    .sort((a, b) => sortKey(b.date) - sortKey(a.date))
    .map((entry) => {
      const actual = byDate.get(entry.date) ?? null;
      const models: Partial<Record<FormulaModelId, ModelScore | null>> = {};

      for (const modelId of MODEL_IDS) {
        const pred = entry.models[modelId];
        if (!pred) continue;

        if (!actual) {
          models[modelId] = null;
          continue;
        }

        const score = scorePrediction(pred, normalizeDraw(actual));
        models[modelId] = score;

        const t = totals[modelId];
        t.drawsScored++;
        if (score.firstPrizeExact) t.firstPrizeExact++;
        if (score.adjacentHit) t.adjacentHits++;
        if (score.backTwoExact) t.backTwoExact++;
        if (score.backTwoReversed) t.backTwoReversed++;
        if (score.backTwoSetHit) t.backTwoSetHits++;
        if (score.frontThreeHit) t.frontThreeHits++;
        if (score.backThreeHit) t.backThreeHits++;
        coverageTotals[modelId] += score.coverageSize;
      }

      return { date: entry.date, recordedAt: entry.recordedAt, actual, models };
    });

  for (const modelId of MODEL_IDS) {
    const t = totals[modelId];
    if (t.drawsScored > 0) {
      t.backTwoSetBaselineRate = Number(
        (coverageTotals[modelId] / t.drawsScored).toFixed(2),
      );
    }
  }

  return { rows, totals };
}
