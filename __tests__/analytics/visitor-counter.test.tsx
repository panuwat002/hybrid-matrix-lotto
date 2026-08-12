// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { VisitorCounter } from "@/components/analytics/VisitorCounter";

describe("VisitorCounter", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows total in Thai locale after successful GET when already counted this session", async () => {
    sessionStorage.setItem("lotto_visit_counted", "1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total: 8921 }),
      }),
    );
    render(<VisitorCounter />);
    await waitFor(() => {
      expect(screen.getByText(/ผู้เยี่ยมชม/)).toBeDefined();
      expect(screen.getByText(/8,921/)).toBeDefined();
    });
    expect(fetch).toHaveBeenCalledWith("/api/counter", { method: "GET" });
  });

  it("POSTs on first visit then sets sessionStorage flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 8922 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<VisitorCounter />);
    await waitFor(() => {
      expect(screen.getByText(/8,922/)).toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/counter", { method: "POST" });
    expect(sessionStorage.getItem("lotto_visit_counted")).toBe("1");
  });

  it("renders nothing when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    const { container } = render(<VisitorCounter />);
    await waitFor(() => {
      expect(container.textContent).toBe("");
    });
  });

  it("renders nothing when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network")),
    );
    const { container } = render(<VisitorCounter />);
    await waitFor(() => {
      expect(container.textContent).toBe("");
    });
  });
});
