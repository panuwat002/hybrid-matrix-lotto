import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/predict/route";

const call = (qs: string) =>
  GET(new Request(`https://example.com/api/predict${qs}`));

describe("GET /api/predict", () => {
  it("rejects a missing date", async () => {
    const res = await call("");
    expect(res.status).toBe(400);
  });

  it("rejects a date that is not 8 digits", async () => {
    const res = await call("?date=1102569");
    expect(res.status).toBe(400);
  });

  it("returns one result per registered model", async () => {
    const res = await call("?date=01102569");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Object.keys(body.data.models).sort()).toEqual([
      "adaptive-frequency",
      "hybrid-matrix",
      "statistical-boost",
    ]);
  });

  it("returns the back-two coverage set for the boost model", async () => {
    const body = await (await call("?date=01102569")).json();
    expect(body.data.models["statistical-boost"].backTwoSet.length).toBeGreaterThan(1);
  });
});
