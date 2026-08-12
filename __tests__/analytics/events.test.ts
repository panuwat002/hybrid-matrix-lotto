import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTrack } = vi.hoisted(() => ({
  mockTrack: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({ track: mockTrack }));

import { trackEvent } from "@/lib/analytics/events";

describe("trackEvent", () => {
  beforeEach(() => {
    mockTrack.mockReset();
  });

  it("calls track with propless events", () => {
    trackEvent("hero_enter");
    expect(mockTrack).toHaveBeenCalledWith("hero_enter", undefined);
  });

  it("calls track for legal_accept", () => {
    trackEvent("legal_accept");
    expect(mockTrack).toHaveBeenCalledWith("legal_accept", undefined);
  });

  it("passes targetDate for matrix_generated", () => {
    trackEvent("matrix_generated", { targetDate: "16082569" });
    expect(mockTrack).toHaveBeenCalledWith("matrix_generated", {
      targetDate: "16082569",
    });
  });

  it("passes kind for number_copied", () => {
    trackEvent("number_copied", { kind: "prize1" });
    expect(mockTrack).toHaveBeenCalledWith("number_copied", { kind: "prize1" });
  });
});
