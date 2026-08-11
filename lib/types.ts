export type DrawDate = string; // "DDMMYYYY" BE, e.g. "16082569"

export type MatrixResult = {
  targetDate: DrawDate;
  firstPrize: string;
  adjacent: [string, string];
  frontThree: [string, string];
  backThree: [string, string];
  backTwo: string;
  tensionScore: number;
};

export type HistoricalDraw = {
  date: string;
  firstPrize: string;
};
