export type DrawDate = string; // "DDMMYYYY" BE, e.g. "16082569"

export type FormulaModelId = "hybrid-matrix" | "adaptive-frequency";

export type MatrixResult = {
  targetDate: DrawDate;
  firstPrize: string;
  adjacent: [string, string];
  frontThree: [string, string];
  backThree: [string, string];
  backTwo: string;
  tensionScore: number;
  modelId?: FormulaModelId;
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
