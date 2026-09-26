// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScorecardView } from "@/components/history/ScorecardView";
import type { Scorecard } from "@/lib/types";

const emptyTotals = {
  drawsScored: 0, firstPrizeExact: 0, adjacentHits: 0, backTwoExact: 0,
  backTwoReversed: 0, backTwoSetHits: 0, frontThreeHits: 0, backThreeHits: 0,
  backTwoSetBaselineRate: 0,
};

const card = (over: Partial<Scorecard> = {}): Scorecard => ({
  rows: [],
  totals: {
    "hybrid-matrix": { ...emptyTotals },
    "adaptive-frequency": { ...emptyTotals },
    "statistical-boost": { ...emptyTotals },
  },
  ...over,
});

const score = (over = {}) => ({
  firstPrizeExact: false, adjacentHit: false, backTwoExact: false,
  backTwoReversed: false, backTwoSetHit: false, coverageSize: 10,
  topTwoExact: false, frontThreeHit: false, backThreeHit: false,
  runningOneHit: false, runningTwoHit: false, ...over,
});

describe("ScorecardView", () => {
  it("explains that nothing is recorded yet when the log is empty", () => {
    render(<ScorecardView scorecard={card()} />);
    expect(screen.getByTestId("scorecard-empty")).toBeDefined();
  });

  it("shows no draw rows when the log is empty", () => {
    render(<ScorecardView scorecard={card()} />);
    expect(screen.queryByTestId("scorecard-rows")).toBeNull();
  });

  it("marks a recorded draw with no published result as awaiting the draw", () => {
    const c = card({
      rows: [{
        date: "01102569", recordedAt: "2026-09-26", actual: null,
        models: { "statistical-boost": null },
      }],
    });
    render(<ScorecardView scorecard={c} />);
    expect(screen.getByTestId("row-01102569").textContent).toContain("รอผล");
  });

  it("shows the actual back-two next to a scored draw", () => {
    const c = card({
      rows: [{
        date: "01102569", recordedAt: "2026-09-26",
        actual: { date: "01102569", firstPrize: "730640", twoDigits: "64" },
        models: { "statistical-boost": score({ backTwoExact: true }) },
      }],
    });
    render(<ScorecardView scorecard={c} />);
    expect(screen.getByTestId("row-01102569").textContent).toContain("64");
  });

  it("reports the chance baseline beside a model's coverage total", () => {
    const c = card({
      rows: [{
        date: "01102569", recordedAt: "2026-09-26",
        actual: { date: "01102569", firstPrize: "730640", twoDigits: "64" },
        models: { "statistical-boost": score({ backTwoSetHit: true }) },
      }],
      totals: {
        ...card().totals,
        "statistical-boost": { ...emptyTotals, drawsScored: 4, backTwoSetHits: 1, backTwoSetBaselineRate: 9.54 },
      },
    });
    render(<ScorecardView scorecard={c} />);
    expect(screen.getByTestId("total-statistical-boost").textContent).toContain("9.54");
  });
});
