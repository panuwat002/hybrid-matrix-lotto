// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultHeader } from "@/components/dashboard/ResultHeader";
import { calculateWithModel } from "@/lib/engine/models";
import HISTORICAL from "@/lib/data/historical.json";

describe("ResultHeader", () => {
  const renderHeader = () =>
    render(
      <ResultHeader
        targetDate="01102569"
        computedAt={new Date("2026-09-26T11:38:00")}
        modelId="statistical-boost"
      />,
    );

  it("shows the draw date", () => {
    renderHeader();
    expect(screen.getByText("1 ต.ค. 2569")).toBeDefined();
  });

  it("shows no statistical-tension meter beside the draw", () => {
    renderHeader();
    expect(screen.queryByText(/STATISTICAL TENSION/i)).toBeNull();
  });
});

describe("why the tension meter cannot sit beside a draw", () => {
  it("returns the same tension for every target date, per model", () => {
    const dates = ["01102569", "16102569", "01092569"];
    for (const m of ["hybrid-matrix", "adaptive-frequency", "statistical-boost"] as const) {
      const scores = dates.map(
        (d) => calculateWithModel(m, d, HISTORICAL as any).tensionScore,
      );
      expect(new Set(scores).size).toBe(1);
    }
  });
});
