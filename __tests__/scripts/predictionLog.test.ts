import { describe, it, expect } from "vitest";
import { assertRecordable, appendPrediction } from "../../scripts/lib/predictionLog.mjs";

const published = [{ date: "16092569", firstPrize: "730640" }];
const recorded = [{ date: "01102569", recordedAt: "2026-09-26", models: {} }];

describe("assertRecordable", () => {
  it("accepts a draw that is neither published nor recorded", () => {
    expect(() => assertRecordable("16102569", published, recorded)).not.toThrow();
  });

  it("refuses a draw whose result is already published", () => {
    expect(() => assertRecordable("16092569", published, recorded)).toThrow(
      /ออกผลแล้ว/,
    );
  });

  it("refuses a draw that was already recorded", () => {
    expect(() => assertRecordable("01102569", published, recorded)).toThrow(
      /บันทึกไว้แล้ว/,
    );
  });

  it("refuses a malformed date", () => {
    expect(() => assertRecordable("1102569", published, recorded)).toThrow(/DDMMYYYY/);
  });
});

describe("appendPrediction", () => {
  it("adds the entry without mutating the original log", () => {
    const entry = { date: "16102569", recordedAt: "2026-09-26", models: {} };
    const next = appendPrediction(recorded, entry);
    expect(next).toHaveLength(2);
    expect(recorded).toHaveLength(1);
  });

  it("keeps the log in chronological order", () => {
    const entry = { date: "16092569", recordedAt: "2026-09-16", models: {} };
    const next = appendPrediction(recorded, entry);
    expect(next.map((e: { date: string }) => e.date)).toEqual(["16092569", "01102569"]);
  });
});
