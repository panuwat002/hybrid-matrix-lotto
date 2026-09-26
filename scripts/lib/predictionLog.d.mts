import type { RecordedPrediction, HistoricalDraw } from "../../lib/types";

export function sortKey(date: string): number;

/** Throws with a Thai message explaining why the draw must not be recorded. */
export function assertRecordable(
  date: string,
  publishedDraws: Pick<HistoricalDraw, "date">[],
  recordedEntries: Pick<RecordedPrediction, "date">[],
): void;

export function appendPrediction<T extends { date: string }>(
  recordedEntries: T[],
  entry: T,
): T[];
