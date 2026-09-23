// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultCard } from "@/components/dashboard/ResultCard";

describe("ResultCard — back-two coverage set", () => {
  it("renders every pair in the coverage set besides the headline", () => {
    render(
      <ResultCard
        title="เลขท้าย 2 ตัว"
        numbers={["46"]}
        kind="back2"
        coverageSet={["46", "64", "17", "71"]}
      />,
    );
    ["64", "17", "71"].forEach((p) =>
      expect(screen.getByText(p)).toBeDefined(),
    );
  });

  it("marks a pair as กลับ when its mirror is ranked ahead of it", () => {
    render(
      <ResultCard
        title="เลขท้าย 2 ตัว"
        numbers={["46"]}
        kind="back2"
        coverageSet={["46", "64"]}
      />,
    );
    expect(screen.getByTestId("back2-pair-64").textContent).toContain("กลับ");
  });

  it("does not mark the first-seen pair of a mirrored couple", () => {
    render(
      <ResultCard
        title="เลขท้าย 2 ตัว"
        numbers={["46"]}
        kind="back2"
        coverageSet={["46", "64", "17"]}
      />,
    );
    expect(screen.getByTestId("back2-pair-17").textContent).not.toContain("กลับ");
  });

  it("renders no coverage row when no set is supplied", () => {
    render(<ResultCard title="เลขท้าย 3 ตัว" numbers={["005"]} kind="back3" />);
    expect(screen.queryByTestId("back2-coverage")).toBeNull();
  });
});
