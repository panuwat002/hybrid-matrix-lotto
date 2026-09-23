export type DrawDate = string; // "DDMMYYYY" BE, e.g. "16082569"

export type FormulaModelId = "hybrid-matrix" | "adaptive-frequency" | "statistical-boost";

export type MatrixResult = {
  targetDate: DrawDate;
  firstPrize: string;
  adjacent: [string, string];
  frontThree: [string, string];
  backThree: [string, string];
  backTwo: string;
  /**
   * Coverage set for the 2-digit prize: the top-ranked pairs plus the reversed
   * form of each. Closed under reversal, deduped, `backTwoSet[0] === backTwo`.
   * Wider coverage, not higher accuracy — see backtest baseline reporting.
   */
  backTwoSet?: string[];
  tensionScore: number;
  modelId?: FormulaModelId;
  candidates?: string[]; // additional high-probability first prize candidates
};

export type HistoricalDraw = {
  date: string;
  firstPrize: string;
  twoDigits?: string;
  threeFront?: string[];
  threeBack?: string[];
  nearFirst?: string[];
};

export type ModelInfo = {
  id: FormulaModelId;
  name: string;
  description: string;
  badge: string;
};

export type HitCategoryCount = {
  totalDraws: number;
  firstPrizeExact: number;
  adjacentHits: number;
  backTwoExact: number;
  backTwoReversedHits: number;
  backTwoSetHits: number;
  topTwoExact: number;
  frontThreeHits: number;
  backThreeHits: number;
  runningOneHits: number;
  runningTwoHits: number;
};

export type ModelBacktestSummary = {
  modelId: FormulaModelId;
  modelName: string;
  metrics: HitCategoryCount;
  rates: {
    backTwoRate: number;
    backTwoReversedRate: number;
    backTwoSetRate: number;
    /** Chance-level coverage of the set: mean set size, in percent. */
    backTwoSetBaselineRate: number;
    topTwoRate: number;
    frontThreeRate: number;
    backThreeRate: number;
    runningOneRate: number;
    runningTwoRate: number;
    compositeScore: number;
  };
};

export type BacktestComparisonReport = {
  testedDrawsCount: number;
  startDate: string;
  endDate: string;
  summaries: Record<FormulaModelId, ModelBacktestSummary>;
  winnerId: FormulaModelId;
  recommendation: string;
};
