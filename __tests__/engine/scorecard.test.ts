import { describe, it, expect } from "vitest";
import { buildScorecard } from "@/lib/engine/scorecard";
import type { HistoricalDraw, MatrixResult, RecordedPrediction } from "@/lib/types";

const pred = (over: Partial<MatrixResult> = {}): MatrixResult => ({
  targetDate: "01102569",
  firstPrize: "123456",
  adjacent: ["123455", "123457"],
  frontThree: ["111", "222"],
  backThree: ["333", "444"],
  backTwo: "46",
  tensionScore: 20,
  modelId: "statistical-boost",
  ...over,
});

const record = (date: string, over: Partial<MatrixResult> = {}): RecordedPrediction => ({
  date,
  recordedAt: "2026-09-26",
  models: { "statistical-boost": pred({ targetDate: date, ...over }) },
});

const draw = (date: string, over: Partial<HistoricalDraw> = {}): HistoricalDraw => ({
  date,
  firstPrize: "730640",
  twoDigits: "64",
  threeFront: ["060", "521"],
  threeBack: ["266", "041"],
  ...over,
});

describe("buildScorecard", () => {
  it("returns no rows when nothing has been recorded", () => {
    const card = buildScorecard([], [draw("01102569")]);
    expect(card.rows).toEqual([]);
    expect(card.totals["statistical-boost"].drawsScored).toBe(0);
  });

  it("marks a recorded draw whose result is not out yet as pending", () => {
    const card = buildScorecard([record("01102569")], []);
    expect(card.rows).toHaveLength(1);
    expect(card.rows[0].actual).toBeNull();
    expect(card.rows[0].models["statistical-boost"]).toBeNull();
  });

  it("leaves a pending draw out of the totals", () => {
    const card = buildScorecard([record("01102569")], []);
    expect(card.totals["statistical-boost"].drawsScored).toBe(0);
  });

  it("scores an exact back-two hit", () => {
    const card = buildScorecard([record("01102569", { backTwo: "64" })], [draw("01102569")]);
    const s = card.rows[0].models["statistical-boost"]!;
    expect(s.backTwoExact).toBe(true);
    expect(s.backTwoReversed).toBe(false);
  });

  it("scores a reversed back-two as reversed, not exact", () => {
    const card = buildScorecard([record("01102569", { backTwo: "46" })], [draw("01102569")]);
    const s = card.rows[0].models["statistical-boost"]!;
    expect(s.backTwoExact).toBe(false);
    expect(s.backTwoReversed).toBe(true);
  });

  it("scores a hit anywhere in the coverage set", () => {
    const card = buildScorecard(
      [record("01102569", { backTwo: "17", backTwoSet: ["17", "71", "64"] })],
      [draw("01102569")],
    );
    const s = card.rows[0].models["statistical-boost"]!;
    expect(s.backTwoExact).toBe(false);
    expect(s.backTwoSetHit).toBe(true);
  });

  it("treats a model with no coverage set as covering its single pair", () => {
    const card = buildScorecard([record("01102569", { backTwo: "64" })], [draw("01102569")]);
    expect(card.rows[0].models["statistical-boost"]!.coverageSize).toBe(1);
  });

  it("scores a front-three hit against either published set", () => {
    const card = buildScorecard(
      [record("01102569", { frontThree: ["999", "521"] })],
      [draw("01102569")],
    );
    expect(card.rows[0].models["statistical-boost"]!.frontThreeHit).toBe(true);
  });

  it("counts a scored draw once in the totals", () => {
    const card = buildScorecard([record("01102569", { backTwo: "64" })], [draw("01102569")]);
    const t = card.totals["statistical-boost"];
    expect(t.drawsScored).toBe(1);
    expect(t.backTwoExact).toBe(1);
  });

  it("orders rows newest draw first", () => {
    const card = buildScorecard(
      [record("01102569"), record("16102569")],
      [draw("01102569"), draw("16102569")],
    );
    expect(card.rows.map((r) => r.date)).toEqual(["16102569", "01102569"]);
  });
});
