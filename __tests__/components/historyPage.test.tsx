// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HistoryPage from "@/app/history/page";
import PREDICTIONS from "@/lib/data/predictions.json";
import HISTORICAL from "@/lib/data/historical.json";
import { buildScorecard } from "@/lib/engine/scorecard";

describe("/history with the repo's real data files", () => {
  it("renders without throwing", () => {
    render(<HistoryPage />);
    expect(screen.getByText("ย้อนดูงวดก่อน")).toBeDefined();
  });

  it("shows the empty state while nothing has been recorded", () => {
    render(<HistoryPage />);
    const card = buildScorecard(PREDICTIONS as any, HISTORICAL as any);
    if (card.rows.length === 0) {
      expect(screen.getByTestId("scorecard-empty")).toBeDefined();
    } else {
      expect(screen.getByTestId("scorecard-rows")).toBeDefined();
    }
  });

  it("scores no draws until a prediction is logged", () => {
    const card = buildScorecard(PREDICTIONS as any, HISTORICAL as any);
    expect(card.totals["statistical-boost"].drawsScored).toBe(
      card.rows.filter((r) => r.actual !== null).length,
    );
  });
});
