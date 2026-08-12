# Analytics + Public Counter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ติดตั้ง 3 sub-features ตาม spec — (1) Vercel Analytics auto pageviews + custom events, (2) Upstash-backed public visitor counter บน landing footer, (3) typed event vocabulary สำหรับ funnel — พร้อม privacy policy update ให้ตรงกับความจริงใหม่

**Architecture:** Analytics แยกออกจาก request path ของ engine 100% (import แค่จาก UI + Route Handler ใหม่) → analytics ล้ม = ไม่กระทบการคำนวณ; รองรับ 3 provider เชื่อมกัน (Vercel Analytics client SDK + Upstash REST + Vercel deployment env); ทุก failure path ทำให้ counter/analytics เงียบไม่ crash

**Tech Stack:** `@vercel/analytics` (client SDK, ~3KB), `@upstash/redis` (REST-based, no long-lived connection), Next.js 14 Route Handlers, existing Vitest test infrastructure

## Global Constraints

- **ห้ามแตะ `lib/engine/**`** — deterministic contract คงเดิม, 42 tests ปัจจุบันต้องยัง pass
- **ห้ามใส่ analytics import ใน `lib/engine/**` หรือ `lib/session/**`** — ESLint restricted-imports + `import "server-only"` ที่ `lib/analytics/upstash.ts`
- **Cookie-less:** ห้ามใช้ cookie ใหม่สำหรับ analytics/counter — Vercel Analytics + Upstash counter ต้อง cookieless
- **Redis key namespace:** `hybrid-matrix:visits:total` (single integer key)
- **Env vars ที่ต้องมี** (คุณตั้งใน Vercel dashboard): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — code ต้อง graceful degrade เมื่อ 2 ตัวนี้ไม่มี (dev หรือ Upstash down)
- **Rate limit สำหรับ counter:** 5 hits/นาที/IP (bucket = `"counter"`) — แยกจาก generateMatrix bucket `"default"` (20/นาที)
- **Event names:** ตายตัวตาม EventMap ใน spec — `hero_enter`, `legal_back`, `legal_accept`, `matrix_generated`, `number_copied`, `support_qr_open`, `picker_scrollback`
- **Vitest test framework** — reuse existing patterns (mock next/headers, __resetRateLimiterForTests)
- **Commit** ทุก task ด้วย Conventional Commits ( `feat(analytics):`, `feat(counter):`, `chore(analytics):`, `docs(privacy):`)

---

## File Structure

**New files:**
- `lib/analytics/events.ts` — typed `trackEvent()` wrapper รอบ `@vercel/analytics`
- `lib/analytics/upstash.ts` — server-only Upstash Redis client (`readTotal`, `incrementTotal`)
- `app/api/counter/route.ts` — Next.js Route Handler: GET total / POST increment
- `components/analytics/VisitorCounter.tsx` — client component (loading → shown/hidden state machine)
- `__tests__/analytics/events.test.ts`
- `__tests__/analytics/upstash.test.ts`
- `__tests__/analytics/visitor-counter.test.tsx`
- `__tests__/api/counter.test.ts`

**Modified files:**
- `lib/actions/rateLimit.ts` — extend `enforceRateLimit(ip, opts?)` with `{limit, windowMs, bucket}` optional overrides
- `__tests__/actions/rateLimit.test.ts` — add tests for bucket isolation + custom limits
- `.eslintrc.json` — add `@/lib/analytics/upstash` to restricted-imports for components
- `app/layout.tsx` — add `<Analytics />` component
- `app/page.tsx` — mount `<VisitorCounter />` in footer + `trackEvent('hero_enter')` + `trackEvent('legal_back')`
- `components/gateway/LegalCheckpoint.tsx` — `trackEvent('legal_accept')` in onAccept
- `components/dashboard/GenerateButton.tsx` — `trackEvent('matrix_generated', {targetDate})` on success
- `components/dashboard/CopyButton.tsx` — accept `kind` prop, `trackEvent('number_copied', {kind})` on success
- `components/dashboard/ResultCard.tsx` — pass `kind` to CopyButton
- `components/dashboard/FeaturedPrize.tsx` — pass `kind` to CopyButton
- `components/dashboard/SupportSection.tsx` — `trackEvent('support_qr_open')` on open toggle (not close)
- `components/dashboard/DashboardClient.tsx` — `trackEvent('picker_scrollback')` in scrollToPicker
- `app/privacy/page.tsx` — rewrite section 2 → 2a + 2b, update section 3/4
- `package.json` — add `@vercel/analytics`, `@upstash/redis`

---

## Task 1: Extend rateLimit with bucket + limit options

**Files:**
- Modify: `lib/actions/rateLimit.ts`
- Modify: `__tests__/actions/rateLimit.test.ts`

**Interfaces:**
- Consumes: nothing new (existing `headers()` from `next/headers`)
- Produces:
  ```typescript
  type RateLimitOptions = { limit?: number; windowMs?: number; bucket?: string };
  function enforceRateLimit(ip: string, opts?: RateLimitOptions): void;
  ```
  - Defaults: `limit=20`, `windowMs=60_000`, `bucket="default"`
  - Existing single-arg call sites (generateMatrix) unchanged in behavior
  - Different buckets do not share limits

- [ ] **Step 1.1: Add failing tests for bucket isolation + custom limits**

Add to `__tests__/actions/rateLimit.test.ts` at the end of the existing `describe` block:

```ts
  it("isolates per bucket — same IP different bucket", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("1.2.3.4")).toThrow("RATE_LIMITED");
    // Different bucket: fresh counter
    expect(() =>
      enforceRateLimit("1.2.3.4", { bucket: "counter" }),
    ).not.toThrow();
  });

  it("respects custom limit override", () => {
    for (let i = 0; i < 5; i++) {
      enforceRateLimit("1.2.3.4", { limit: 5, bucket: "counter" });
    }
    expect(() =>
      enforceRateLimit("1.2.3.4", { limit: 5, bucket: "counter" }),
    ).toThrow("RATE_LIMITED");
  });

  it("respects custom windowMs override", () => {
    enforceRateLimit("1.2.3.4", { limit: 1, windowMs: 5000, bucket: "short" });
    expect(() =>
      enforceRateLimit("1.2.3.4", { limit: 1, windowMs: 5000, bucket: "short" }),
    ).toThrow();
    vi.advanceTimersByTime(5001);
    expect(() =>
      enforceRateLimit("1.2.3.4", { limit: 1, windowMs: 5000, bucket: "short" }),
    ).not.toThrow();
  });
```

- [ ] **Step 1.2: Run tests → new tests FAIL, old tests still pass**

Run: `pnpm test __tests__/actions/rateLimit.test.ts`
Expected: 4 pass, 3 fail (new tests reference options that don't exist yet)

- [ ] **Step 1.3: Implement extension in `lib/actions/rateLimit.ts`**

Replace the entire file with:

```typescript
import "server-only";
import { headers } from "next/headers";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = 20;
const DEFAULT_BUCKET = "default";

// key = `${bucket}:${ip}`  →  timestamps
const requestLog = new Map<string, number[]>();

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  bucket?: string;
};

export function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export function enforceRateLimit(
  ip: string,
  opts: RateLimitOptions = {},
): void {
  const limit = opts.limit ?? DEFAULT_MAX_PER_WINDOW;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const bucket = opts.bucket ?? DEFAULT_BUCKET;
  const key = `${bucket}:${ip}`;

  const now = Date.now();
  const prior = requestLog.get(key) ?? [];
  const recent = prior.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    throw new Error("RATE_LIMITED");
  }
  recent.push(now);
  requestLog.set(key, recent);
}

/** Test-only reset — do not call from application code. */
export function __resetRateLimiterForTests(): void {
  requestLog.clear();
}
```

- [ ] **Step 1.4: Run all rateLimit tests → PASS**

Run: `pnpm test __tests__/actions/rateLimit.test.ts`
Expected: 7 tests passed (4 original + 3 new)

- [ ] **Step 1.5: Run action tests to confirm no regression**

Run: `pnpm test __tests__/actions/`
Expected: 8 tests (4 rateLimit new-plus-existing + 4 generateMatrix) all pass

- [ ] **Step 1.6: Commit**

```bash
git add lib/actions/rateLimit.ts __tests__/actions/rateLimit.test.ts
git commit -m "feat(security): rateLimit supports bucket + custom limits

Existing enforceRateLimit(ip) behavior unchanged (defaults
limit=20, windowMs=60_000, bucket='default'). New optional
opts arg lets callers isolate counters:

  enforceRateLimit(ip, { limit: 5, bucket: 'counter' })

Storage rekeyed as \`\${bucket}:\${ip}\` so buckets do not share
limits. Sets up the counter API route to have a tighter cap
than generateMatrix without cross-contamination.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Upstash client + ESLint restriction

**Files:**
- Create: `lib/analytics/upstash.ts`
- Create: `__tests__/analytics/upstash.test.ts`
- Modify: `.eslintrc.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@upstash/redis` npm package, env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Produces:
  ```typescript
  async function readTotal(): Promise<number | null>;
  async function incrementTotal(): Promise<number | null>;
  ```
  - Returns `null` when env vars missing OR Upstash request throws
  - Returns `0` when key doesn't exist yet (via `?? 0`)

- [ ] **Step 2.1: Install `@upstash/redis`**

Run: `pnpm add @upstash/redis`

- [ ] **Step 2.2: Write failing tests**

`__tests__/analytics/upstash.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock @upstash/redis BEFORE import
const mockGet = vi.fn();
const mockIncr = vi.fn();
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: mockGet,
    incr: mockIncr,
  })),
}));

describe("upstash analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGet.mockReset();
    mockIncr.mockReset();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("readTotal returns null when env vars missing", async () => {
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBeNull();
  });

  it("incrementTotal returns null when env vars missing", async () => {
    const { incrementTotal } = await import("@/lib/analytics/upstash");
    expect(await incrementTotal()).toBeNull();
  });

  it("readTotal returns 0 when key not set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockGet.mockResolvedValueOnce(null);
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBe(0);
    expect(mockGet).toHaveBeenCalledWith("hybrid-matrix:visits:total");
  });

  it("readTotal returns stored integer", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockGet.mockResolvedValueOnce(42);
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBe(42);
  });

  it("incrementTotal returns new total", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockIncr.mockResolvedValueOnce(43);
    const { incrementTotal } = await import("@/lib/analytics/upstash");
    expect(await incrementTotal()).toBe(43);
    expect(mockIncr).toHaveBeenCalledWith("hybrid-matrix:visits:total");
  });

  it("readTotal returns null on Redis error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockGet.mockRejectedValueOnce(new Error("network"));
    const { readTotal } = await import("@/lib/analytics/upstash");
    expect(await readTotal()).toBeNull();
  });

  it("incrementTotal returns null on Redis error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "abc";
    mockIncr.mockRejectedValueOnce(new Error("network"));
    const { incrementTotal } = await import("@/lib/analytics/upstash");
    expect(await incrementTotal()).toBeNull();
  });
});
```

- [ ] **Step 2.3: Run tests → FAIL (module not found)**

Run: `pnpm test __tests__/analytics/upstash.test.ts`
Expected: FAIL — Cannot find module '@/lib/analytics/upstash'

- [ ] **Step 2.4: Update `__tests__/stubs/server-only.ts` handling (already exists — verify)**

Confirm the existing vitest alias `"server-only" → "__tests__/stubs/server-only.ts"` is in `vitest.config.ts`. If not, the import will fail. (Should already exist from Task 8 of prior plan.)

Run: `pnpm exec grep -n server-only vitest.config.ts` (or Grep tool)
Expected: alias present

- [ ] **Step 2.5: Implement `lib/analytics/upstash.ts`**

```typescript
import "server-only";
import { Redis } from "@upstash/redis";

const TOTAL_KEY = "hybrid-matrix:visits:total";

let cached: Redis | null = null;
function client(): Redis | null {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cached = new Redis({ url, token });
  return cached;
}

export async function readTotal(): Promise<number | null> {
  const c = client();
  if (!c) return null;
  try {
    const v = await c.get<number>(TOTAL_KEY);
    return v ?? 0;
  } catch {
    return null;
  }
}

export async function incrementTotal(): Promise<number | null> {
  const c = client();
  if (!c) return null;
  try {
    return await c.incr(TOTAL_KEY);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2.6: Reset client cache between tests**

Because the `cached` module-level var persists across tests, the test file uses `vi.resetModules()` in beforeEach so each test re-imports fresh. Verify the tests pass.

Run: `pnpm test __tests__/analytics/upstash.test.ts`
Expected: 7 tests passed

- [ ] **Step 2.7: Add ESLint restriction for `@/lib/analytics/upstash`**

Modify `.eslintrc.json` — extend the existing `patterns` array under `overrides[0].rules["no-restricted-imports"][1].patterns` to include:

```json
{
  "group": ["@/lib/analytics/upstash"],
  "message": "Upstash client is server-only. Call via @/app/api/counter/route.ts only."
}
```

The full patterns block becomes:

```json
"patterns": [
  {
    "group": ["@/lib/engine", "@/lib/engine/*"],
    "message": "Engine ต้องเรียกผ่าน @/lib/actions/* เท่านั้น"
  },
  {
    "group": ["@/lib/session", "@/lib/session/*"],
    "message": "Session helpers ต้องเรียกจาก server action หรือ server component (app/**/page.tsx, layout.tsx) เท่านั้น"
  },
  {
    "group": ["@/lib/analytics/upstash"],
    "message": "Upstash client is server-only. Call via @/app/api/counter/route.ts only."
  }
]
```

- [ ] **Step 2.8: Run lint**

Run: `pnpm lint`
Expected: clean (no components import upstash yet)

- [ ] **Step 2.9: Commit**

```bash
git add lib/analytics/upstash.ts __tests__/analytics/upstash.test.ts .eslintrc.json package.json pnpm-lock.yaml
git commit -m "feat(analytics): Upstash Redis client with graceful degradation

- lib/analytics/upstash.ts: readTotal() / incrementTotal() returning
  null on missing env vars or Redis errors, 0 when key not yet set
- Single cached Redis instance per warm serverless container
- server-only import guard + ESLint restricted-imports keep it out
  of client bundles
- @upstash/redis package added (REST-based, no TCP long-connection)
- 7 unit tests covering env-missing, key-missing, integer read,
  increment, and both error paths

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Counter API Route

**Files:**
- Create: `app/api/counter/route.ts`
- Create: `__tests__/api/counter.test.ts`

**Interfaces:**
- Consumes: `readTotal`, `incrementTotal` from Task 2; `enforceRateLimit`, `getClientIp` from Task 1
- Produces:
  - `GET /api/counter` → `200 {total: number}` OR `503 {error: "unavailable"}`
  - `POST /api/counter` → `200 {total: number}` OR `429 {error: "rate_limited"}` OR `503 {error: "unavailable"}`

- [ ] **Step 3.1: Write failing test**

`__tests__/api/counter.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockReadTotal = vi.fn();
const mockIncrementTotal = vi.fn();

vi.mock("@/lib/analytics/upstash", () => ({
  readTotal: mockReadTotal,
  incrementTotal: mockIncrementTotal,
}));

vi.mock("next/headers", () => ({
  headers: () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));

import { GET, POST } from "@/app/api/counter/route";
import { __resetRateLimiterForTests } from "@/lib/actions/rateLimit";

describe("/api/counter", () => {
  beforeEach(() => {
    mockReadTotal.mockReset();
    mockIncrementTotal.mockReset();
    __resetRateLimiterForTests();
  });

  it("GET returns total from upstash", async () => {
    mockReadTotal.mockResolvedValueOnce(123);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ total: 123 });
  });

  it("GET returns 503 when upstash returns null", async () => {
    mockReadTotal.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("POST increments and returns new total", async () => {
    mockIncrementTotal.mockResolvedValueOnce(124);
    const res = await POST();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ total: 124 });
  });

  it("POST returns 429 after 5 hits from same IP", async () => {
    mockIncrementTotal.mockResolvedValue(100);
    for (let i = 0; i < 5; i++) {
      const r = await POST();
      expect(r.status).toBe(200);
    }
    const res = await POST();
    expect(res.status).toBe(429);
  });

  it("POST returns 503 when upstash returns null", async () => {
    mockIncrementTotal.mockResolvedValueOnce(null);
    const res = await POST();
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 3.2: Run test → FAIL (route not found)**

Run: `pnpm test __tests__/api/counter.test.ts`
Expected: FAIL

- [ ] **Step 3.3: Implement `app/api/counter/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { readTotal, incrementTotal } from "@/lib/analytics/upstash";
import { enforceRateLimit, getClientIp } from "@/lib/actions/rateLimit";

export async function GET() {
  const total = await readTotal();
  if (total === null) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ total });
}

export async function POST() {
  try {
    enforceRateLimit(getClientIp(), {
      limit: 5,
      windowMs: 60_000,
      bucket: "counter",
    });
  } catch {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const total = await incrementTotal();
  if (total === null) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ total });
}
```

- [ ] **Step 3.4: Run test → PASS**

Run: `pnpm test __tests__/api/counter.test.ts`
Expected: 5 tests passed

- [ ] **Step 3.5: Run full suite to confirm no regression**

Run: `pnpm test`
Expected: all previous (42) + new (7 upstash + 3 rateLimit + 5 counter) = 57 pass

- [ ] **Step 3.6: Commit**

```bash
git add app/api/counter/route.ts __tests__/api/counter.test.ts
git commit -m "feat(counter): /api/counter GET+POST with rate limit

- GET  /api/counter → { total } or 503
- POST /api/counter → increment + { total }, or 429/503

Uses counter bucket in rate limiter (5/min/IP) so it does not
consume the generateMatrix budget. Upstash-null propagates to
503 without crashing the route.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: VisitorCounter component + wire into landing

**Files:**
- Create: `components/analytics/VisitorCounter.tsx`
- Create: `__tests__/analytics/visitor-counter.test.tsx`
- Modify: `app/page.tsx` (mount in footer)
- Modify: `vitest.config.ts` (if `environment: "node"` — need "jsdom" for React component tests)
- Modify: `package.json` (add jsdom dev-dep if not present)

**Interfaces:**
- Consumes: `/api/counter` (fetch), `sessionStorage`
- Produces: `<VisitorCounter />` — no props

- [ ] **Step 4.1: Ensure jsdom is available for React component testing**

Check `vitest.config.ts`. Current `environment: "node"`. React component tests need `jsdom` or `happy-dom`.

Simplest: use per-file environment comment. Add at the top of the test file: `// @vitest-environment jsdom`

Install:

```bash
pnpm add -D jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4.2: Write failing tests**

`__tests__/analytics/visitor-counter.test.tsx`:

```tsx
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
```

- [ ] **Step 4.3: Run test → FAIL (component not found)**

Run: `pnpm test __tests__/analytics/visitor-counter.test.tsx`
Expected: FAIL

- [ ] **Step 4.4: Implement `components/analytics/VisitorCounter.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "shown"; total: number };

const SESSION_KEY = "lotto_visit_counted";

export function VisitorCounter() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyCounted = true;
    }

    const opts: RequestInit = alreadyCounted
      ? { method: "GET" }
      : { method: "POST" };

    fetch("/api/counter", opts)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { total: number }) => {
        if (!alreadyCounted) {
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* ignore private mode */
          }
        }
        setState({ kind: "shown", total: data.total });
      })
      .catch(() => setState({ kind: "hidden" }));
  }, []);

  if (state.kind === "hidden") return null;

  return (
    <span className="font-mono text-xs text-matrix-cyan/60">
      ผู้เยี่ยมชม{" "}
      {state.kind === "loading" ? (
        <span aria-hidden>. . .</span>
      ) : (
        state.total.toLocaleString("th-TH")
      )}{" "}
      คน
    </span>
  );
}
```

- [ ] **Step 4.5: Run tests → PASS**

Run: `pnpm test __tests__/analytics/visitor-counter.test.tsx`
Expected: 4 tests passed

- [ ] **Step 4.6: Mount `<VisitorCounter />` in landing footer**

Modify `app/page.tsx` footer section. Locate:

```tsx
<footer className="mx-auto mt-16 flex max-w-2xl items-center justify-center gap-6 border-t border-matrix-cyan/15 pt-4 font-thai text-xs text-matrix-green/70">
  <Link href="/about" className="transition hover:text-matrix-cyan">
    เกี่ยวกับสูตร
  </Link>
  <span aria-hidden>·</span>
  <Link href="/privacy" className="transition hover:text-matrix-cyan">
    นโยบายความเป็นส่วนตัว
  </Link>
</footer>
```

Replace with (add import at top: `import { VisitorCounter } from "@/components/analytics/VisitorCounter";`):

```tsx
<footer className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-4 border-t border-matrix-cyan/15 pt-4 font-thai text-xs text-matrix-green/70 md:gap-6">
  <Link href="/about" className="transition hover:text-matrix-cyan">
    เกี่ยวกับสูตร
  </Link>
  <span aria-hidden>·</span>
  <Link href="/privacy" className="transition hover:text-matrix-cyan">
    นโยบายความเป็นส่วนตัว
  </Link>
  <span aria-hidden>·</span>
  <VisitorCounter />
</footer>
```

`flex-wrap` handles mobile stacking when counter number gets long.

- [ ] **Step 4.7: Run lint + full test suite**

Run: `pnpm lint && pnpm test`
Expected: lint clean; all tests pass

- [ ] **Step 4.8: Commit**

```bash
git add components/analytics/VisitorCounter.tsx __tests__/analytics/visitor-counter.test.tsx app/page.tsx package.json pnpm-lock.yaml
git commit -m "feat(counter): VisitorCounter component + landing footer

Loading → shown / loading → hidden state machine. First-visit-in-
session POSTs and sets sessionStorage flag; subsequent renders in
the same tab GET-only. On any error path (503, network, JSON parse)
the component renders null so the footer stays clean.

Uses toLocaleString('th-TH') for the number (proper Thai digit
grouping). Mounted between the /privacy link and the footer end;
flex-wrap so mobile does not overflow.

Tests: 4 covering GET/POST paths, sessionStorage side-effect,
hidden-on-error. Uses jsdom via // @vitest-environment jsdom
comment (per-file, not global).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Vercel Analytics package + layout wiring

**Files:**
- Modify: `app/layout.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@vercel/analytics/react`
- Produces: `<Analytics />` mounted at layout level → auto pageview beacon on every route

- [ ] **Step 5.1: Install package**

```bash
pnpm add @vercel/analytics
```

- [ ] **Step 5.2: Add `<Analytics />` to `app/layout.tsx`**

Locate the existing layout:

```tsx
import type { Metadata } from "next";
import { JetBrains_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const thai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "Hybrid Matrix — Lotto Analyzer",
  description: "ระบบวิเคราะห์สลากด้วย Deterministic Hybrid Matrix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${mono.variable} ${thai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Add import + component. Result:

```tsx
import type { Metadata } from "next";
import { JetBrains_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const thai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "Hybrid Matrix — Lotto Analyzer",
  description: "ระบบวิเคราะห์สลากด้วย Deterministic Hybrid Matrix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${mono.variable} ${thai.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 5.3: Verify build + lint + tests**

Run: `pnpm lint && pnpm test`
Expected: clean; tests pass

*Note:* Full `pnpm build` may fail on exFAT (existing known issue) — skip; Vercel production build handles it.

- [ ] **Step 5.4: Commit**

```bash
git add app/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat(analytics): mount Vercel Analytics beacon

<Analytics /> auto-tracks pageviews, referrer, geo (IP discarded
post-lookup), and browser/OS. Cookieless. No config needed on
Vercel — deployment identity authenticates.

Free tier: 2,500 events/month (Hobby plan).

Custom event vocabulary lives in @/lib/analytics/events (next task).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Typed event vocabulary

**Files:**
- Create: `lib/analytics/events.ts`
- Create: `__tests__/analytics/events.test.ts`

**Interfaces:**
- Consumes: `track` from `@vercel/analytics`
- Produces:
  ```typescript
  type EventName =
    | "hero_enter"
    | "legal_back"
    | "legal_accept"
    | "matrix_generated"
    | "number_copied"
    | "support_qr_open"
    | "picker_scrollback";
  function trackEvent(name: "matrix_generated", props: { targetDate: string }): void;
  function trackEvent(name: "number_copied", props: { kind: "prize1" | "adjacent" | "front3" | "back3" | "back2" }): void;
  function trackEvent(name: Exclude<EventName, "matrix_generated" | "number_copied">): void;
  ```

- [ ] **Step 6.1: Write failing tests**

`__tests__/analytics/events.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTrack = vi.fn();
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
```

- [ ] **Step 6.2: Run test → FAIL (module not found)**

Run: `pnpm test __tests__/analytics/events.test.ts`
Expected: FAIL

- [ ] **Step 6.3: Implement `lib/analytics/events.ts`**

```typescript
import { track } from "@vercel/analytics";

type EventMap = {
  hero_enter: undefined;
  legal_back: undefined;
  legal_accept: undefined;
  matrix_generated: { targetDate: string };
  number_copied: {
    kind: "prize1" | "adjacent" | "front3" | "back3" | "back2";
  };
  support_qr_open: undefined;
  picker_scrollback: undefined;
};

export function trackEvent<K extends keyof EventMap>(
  name: K,
  ...args: EventMap[K] extends undefined ? [] : [props: EventMap[K]]
): void {
  const props = args[0] as Record<string, string> | undefined;
  track(name, props);
}
```

The variadic-`args` trick makes the second arg required for events with props and forbidden for those without — better ergonomics than `props?:`.

- [ ] **Step 6.4: Run tests → PASS**

Run: `pnpm test __tests__/analytics/events.test.ts`
Expected: 4 tests passed

- [ ] **Step 6.5: Commit**

```bash
git add lib/analytics/events.ts __tests__/analytics/events.test.ts
git commit -m "feat(analytics): typed trackEvent wrapper

Wraps @vercel/analytics track() with EventMap-driven typing:
- 7 named events (see spec §6)
- Variadic-args pattern: propless events forbid a second arg,
  matrix_generated requires {targetDate}, number_copied requires
  {kind: 'prize1' | 'adjacent' | 'front3' | 'back3' | 'back2'}
- Typo in event name → compile error (single source of truth)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Instrument all 7 events across UI

**Files:**
- Modify: `app/page.tsx` (hero_enter, legal_back)
- Modify: `components/gateway/LegalCheckpoint.tsx` (legal_accept — moved from parent handler to component for isolation)
- Modify: `components/dashboard/GenerateButton.tsx` (matrix_generated)
- Modify: `components/dashboard/CopyButton.tsx` (accept kind prop, number_copied)
- Modify: `components/dashboard/ResultCard.tsx` (pass kind)
- Modify: `components/dashboard/FeaturedPrize.tsx` (pass kind)
- Modify: `components/dashboard/SupportSection.tsx` (support_qr_open)
- Modify: `components/dashboard/DashboardClient.tsx` (picker_scrollback)

**Interfaces:**
- Consumes: `trackEvent` from Task 6
- Produces: no exported changes; runtime side-effect only

- [ ] **Step 7.1: Add kind prop to CopyButton**

Modify `components/dashboard/CopyButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/events";

type CopyKind = "prize1" | "adjacent" | "front3" | "back3" | "back2";

type Props = {
  text: string;
  kind: CopyKind;
  size?: "sm" | "lg";
};
type State = "idle" | "copied" | "failed";

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-2 py-1 text-[10px]",
  lg: "px-3 py-1.5 text-xs",
};

export function CopyButton({ text, kind, size = "sm" }: Props) {
  const [state, setState] = useState<State>("idle");

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
      trackEvent("number_copied", { kind });
    } catch {
      setState("failed");
    } finally {
      setTimeout(() => setState("idle"), 1600);
    }
  };

  const label =
    state === "copied" ? "COPIED" : state === "failed" ? "FAILED" : "COPY";
  const tone =
    state === "failed"
      ? "border-red-500/60 text-red-300 hover:bg-red-500/10"
      : "border-matrix-cyan/40 text-matrix-cyan hover:bg-matrix-cyan/10";

  return (
    <button
      onClick={copy}
      className={`ml-2 rounded border font-mono uppercase tracking-wider transition ${SIZE_CLASSES[size]} ${tone}`}
      aria-label={`Copy ${text}`}
    >
      {label}
    </button>
  );
}
```

Note: `kind` is now REQUIRED. TypeScript compile will fail at every CopyButton call site — fix them next steps.

- [ ] **Step 7.2: Pass kind from ResultCard**

Modify `components/dashboard/ResultCard.tsx` — the ResultCard currently takes `title` + `numbers[]`. Adding `kind` as required prop:

```tsx
import { CopyButton } from "./CopyButton";
import { groupDigits } from "@/lib/format";

type Props = {
  title: string;
  numbers: string[];
  kind: "front3" | "back3" | "back2";
};

export function ResultCard({ title, numbers, kind }: Props) {
  return (
    <article className="card-in rounded-xl border border-matrix-green/30 bg-matrix-dim/70 p-5 shadow-[0_0_20px_-8px_#00ff9c]">
      <h3 className="mb-3 font-thai text-xs uppercase tracking-[0.25em] text-matrix-cyan">
        {title}
      </h3>
      <ul className="space-y-2">
        {numbers.map((n, i) => (
          <li key={`${n}-${i}`} className="flex items-center justify-between">
            <span className="font-mono text-3xl tabular-nums text-matrix-green drop-shadow-[0_0_8px_#00ff9c]">
              {groupDigits(n)}
            </span>
            <CopyButton text={n} kind={kind} />
          </li>
        ))}
      </ul>
    </article>
  );
}
```

- [ ] **Step 7.3: Pass kind from FeaturedPrize**

Modify `components/dashboard/FeaturedPrize.tsx` — change the 2 CopyButton call sites:

```tsx
<CopyButton text={firstPrize} size="lg" kind="prize1" />
```

and inside the adjacent map:

```tsx
<CopyButton text={n} kind="adjacent" />
```

- [ ] **Step 7.4: Pass kind from DashboardClient's ResultCards**

Modify `components/dashboard/DashboardClient.tsx` — set `kind` on each ResultCard:

```tsx
<ResultCard
  title="เลขหน้า 3 ตัว"
  numbers={result.data.frontThree}
  kind="front3"
/>
<ResultCard
  title="เลขท้าย 3 ตัว"
  numbers={result.data.backThree}
  kind="back3"
/>
<ResultCard
  title="เลขท้าย 2 ตัว"
  numbers={[result.data.backTwo]}
  kind="back2"
/>
```

- [ ] **Step 7.5: Add hero_enter + legal_back to `app/page.tsx`**

Import `trackEvent` at top:

```tsx
import { trackEvent } from "@/lib/analytics/events";
```

Wrap the hero button onClick:

```tsx
<button
  onClick={() => {
    trackEvent("hero_enter");
    setStep("legal");
  }}
  className="..."
>
```

Wrap the "← กลับ" button onClick:

```tsx
<button
  onClick={() => {
    trackEvent("legal_back");
    setStep("hero");
  }}
  disabled={pending}
  className="..."
>
```

- [ ] **Step 7.6: Add legal_accept to `components/gateway/LegalCheckpoint.tsx`**

The current component wraps user's `onAccept` prop. Add tracking inside the button handler:

```tsx
<button
  onClick={() => {
    trackEvent("legal_accept");
    onAccept();
  }}
  disabled={disabled}
  className="..."
>
  {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ Dashboard"}
</button>
```

Add import at top:

```tsx
import { trackEvent } from "@/lib/analytics/events";
```

- [ ] **Step 7.7: Add matrix_generated to `components/dashboard/GenerateButton.tsx`**

Import + modify the run handler:

```tsx
import { trackEvent } from "@/lib/analytics/events";

// ... inside run(), after onResult(r):
try {
  const r = await generateMatrix(date);
  trackEvent("matrix_generated", { targetDate: date });
  onResult(r);
} catch (err) {
  // ... unchanged
}
```

- [ ] **Step 7.8: Add support_qr_open to `components/dashboard/SupportSection.tsx`**

Import + wrap the toggle handler:

```tsx
import { trackEvent } from "@/lib/analytics/events";

// The existing setOpen((v) => !v) call becomes:
onClick={() => {
  setOpen((v) => {
    if (!v) trackEvent("support_qr_open"); // only when transitioning to open
    return !v;
  });
}}
```

- [ ] **Step 7.9: Add picker_scrollback to `components/dashboard/DashboardClient.tsx`**

Import + wrap scrollToPicker:

```tsx
import { trackEvent } from "@/lib/analytics/events";

const scrollToPicker = () => {
  trackEvent("picker_scrollback");
  pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
};
```

- [ ] **Step 7.10: Run lint + full test suite**

Run: `pnpm lint && pnpm test`
Expected: lint clean; all tests pass (57 total)

Note: existing tests do NOT mock `@vercel/analytics` in UI tests because there are no UI tests. If a future test renders a component that calls trackEvent, mock `@vercel/analytics` in that test.

- [ ] **Step 7.11: Commit**

```bash
git add app/page.tsx components/gateway/LegalCheckpoint.tsx components/dashboard/GenerateButton.tsx components/dashboard/CopyButton.tsx components/dashboard/ResultCard.tsx components/dashboard/FeaturedPrize.tsx components/dashboard/SupportSection.tsx components/dashboard/DashboardClient.tsx
git commit -m "feat(analytics): instrument 7 funnel events across UI

- hero_enter: Landing hero CTA click
- legal_back: ← กลับ on Legal step
- legal_accept: LegalCheckpoint accept button
- matrix_generated {targetDate}: GenerateButton success
- number_copied {kind}: CopyButton (kind flows: FeaturedPrize=prize1
  / adjacent, ResultCards=front3 / back3 / back2)
- support_qr_open: SupportSection open toggle (not close)
- picker_scrollback: '↑ เลือกงวดใหม่' click

CopyButton's kind prop is required (compile-time exhaustiveness).
support_qr_open fires only on transition to open, not on every click.
Analytics failure is silent (Vercel SDK no-ops when blocked / no
network) — no UI impact.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Privacy Policy update

**Files:**
- Modify: `app/privacy/page.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: rewritten Section 2, new Section 2b, updated Sections 3+4

- [ ] **Step 8.1: Rewrite Section 2 in `app/privacy/page.tsx`**

Find the existing Section 2:

```tsx
<section className="mb-8 rounded-xl border border-matrix-cyan/30 bg-matrix-dim/40 p-5">
  <h2 className="mb-3 font-thai text-lg text-matrix-cyan">
    2. ข้อมูลที่ไม่เก็บ
  </h2>
  <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
    <li>• ไม่มี Google Analytics / ไม่มี tracking pixel</li>
    <li>• ไม่มี user account / ไม่ต้องล็อกอิน</li>
    <li>• ไม่มี database ที่บันทึกการใช้งาน</li>
    <li>
      • ไฟล์สลิปที่อัปโหลด (mockup UI) —{" "}
      <b>ไม่ถูกส่งไปที่ server ใดๆ</b> อยู่ในหน้าจอเบราว์เซอร์เท่านั้น
    </li>
  </ul>
</section>
```

Replace with 2 sections (rename to 2a and add 2b, and swap the "ไม่เก็บ" section to become section 2c that follows):

```tsx
<section className="mb-8">
  <h2 className="mb-3 font-thai text-lg text-matrix-green">
    2. ข้อมูลที่เก็บผ่าน Vercel Analytics
  </h2>
  <p className="mb-3 font-thai text-sm leading-relaxed text-matrix-green/85">
    Vercel Analytics เก็บข้อมูลต่อการเยี่ยมชม (ไม่ใช้ cookie, ไม่ track cross-site):
  </p>
  <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
    <li>• URL path ที่เยี่ยมชม (ไม่มี query string)</li>
    <li>• Referrer — เว็บที่นำมา</li>
    <li>
      • Country/City โดยประมาณ จาก IP → geoip แล้ว{" "}
      <b>IP ถูกทิ้งหลัง lookup</b> ไม่เก็บถาวร
    </li>
    <li>• Browser + OS จาก User-Agent</li>
    <li>
      • Custom events: ปุ่ม/action ที่ user ทำ (เช่น{" "}
      <code className="text-matrix-cyan">matrix_generated</code>,{" "}
      <code className="text-matrix-cyan">number_copied</code>)
    </li>
    <li>
      • ใน <code className="text-matrix-cyan">matrix_generated</code>{" "}
      เก็บ target date ที่ user ป้อน (input parameter ไม่ใช่ PII)
    </li>
  </ul>
  <p className="mt-3 font-thai text-xs text-matrix-cyan/70">
    Opt-out: เปิด DoNotTrack header ใน browser หรือใช้ ad blocker
  </p>
</section>

<section className="mb-8">
  <h2 className="mb-3 font-thai text-lg text-matrix-green">
    2b. Public Visitor Counter (Upstash Redis)
  </h2>
  <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
    <li>
      • Counter รวมของการเยี่ยมชมหน้าหลัก — เก็บแค่{" "}
      <b>integer เดียว</b> (จำนวนรวม)
    </li>
    <li>• ไม่เก็บ IP, ไม่เก็บ timestamp, ไม่เก็บ session id, ไม่ระบุตัวตน</li>
    <li>
      • นับสูงสุด 1 ครั้ง/browser session ผ่าน sessionStorage
    </li>
    <li>
      • Server-side rate limit 5 hits/นาที/IP ป้องกันการ spam counter
    </li>
  </ul>
</section>

<section className="mb-8 rounded-xl border border-matrix-cyan/30 bg-matrix-dim/40 p-5">
  <h2 className="mb-3 font-thai text-lg text-matrix-cyan">
    2c. ข้อมูลที่ไม่เก็บ
  </h2>
  <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
    <li>• ไม่มี user account / ไม่ต้องล็อกอิน</li>
    <li>• ไม่มี database ที่บันทึกประวัติการใช้งานราย user</li>
    <li>
      • ไฟล์สลิปที่อัปโหลด (mockup UI) —{" "}
      <b>ไม่ถูกส่งไปที่ server ใดๆ</b> อยู่ในหน้าจอเบราว์เซอร์เท่านั้น
    </li>
  </ul>
</section>
```

- [ ] **Step 8.2: Update Section 3 (Third-Party Services) — add Vercel Analytics + Upstash**

Locate Section 3 and replace the `<ul>` content with:

```tsx
<ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
  <li>
    • <b>Vercel</b> (hosting + analytics) — ได้ IP + User-Agent ตาม server
    log มาตรฐาน; Vercel Analytics ประมวลผลตามรายการใน section 2 ด้านบน
  </li>
  <li>
    • <b>Upstash</b> (Redis storage for visitor counter, hosted in Singapore) —
    เก็บเฉพาะ integer counter ตามรายการใน section 2b
  </li>
  <li>
    • <b>Fonts</b> — self-hosted ผ่าน{" "}
    <code className="text-matrix-cyan">next/font</code> ในเวลา build
    ไม่ fetch จาก Google runtime → เบราว์เซอร์ user ไม่ติดต่อ Google โดยตรง
  </li>
</ul>
```

- [ ] **Step 8.3: Update Section 4 (สิทธิ์ PDPA) — add opt-out guidance**

Replace the existing Section 4 paragraph with:

```tsx
<p className="font-thai text-sm leading-relaxed text-matrix-green/85">
  ระบบไม่บันทึกข้อมูลส่วนบุคคลลง persistent storage รายบุคคล จึงไม่มี
  right-to-access หรือ right-to-delete ที่จะต้องประมวลผล ทางเลือกที่มี:
</p>
<ul className="mt-2 space-y-1 font-thai text-sm leading-relaxed text-matrix-green/85">
  <li>
    • Opt-out จาก Vercel Analytics: เปิด <code className="text-matrix-cyan">DoNotTrack</code>{" "}
    ใน browser หรือใช้ ad blocker (uBlock Origin, AdGuard)
  </li>
  <li>
    • ล้าง counter session flag: clear browsing data ใน browser
  </li>
  <li>• ล้าง unlock cookie: clear browsing data ใน browser</li>
</ul>
```

- [ ] **Step 8.4: Update `metadata.description`**

At the top of `app/privacy/page.tsx`:

```tsx
export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — Hybrid Matrix",
  description:
    "ข้อมูลที่ระบบเก็บ (Vercel Analytics + Upstash counter) และไม่เก็บ ตามหลัก Thai PDPA",
};
```

- [ ] **Step 8.5: Update "อัปเดตล่าสุด" date**

Change:

```tsx
<p className="mb-10 font-thai text-sm text-matrix-cyan/80">
  อัปเดตล่าสุด: 12 สิงหาคม 2569 · สอดคล้อง PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)
</p>
```

- [ ] **Step 8.6: Verify lint + tests**

Run: `pnpm lint && pnpm test`
Expected: clean; all tests pass

- [ ] **Step 8.7: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "docs(privacy): reflect Vercel Analytics + Upstash counter

Section 2 rewritten from 'ข้อมูลที่ไม่เก็บ' (which listed 'no
analytics') into 3 sections:
  2  — Vercel Analytics: pageviews, referrer, geo (IP discarded),
       browser/OS, custom events (matrix_generated, number_copied)
  2b — Public counter: integer only, no identity, 1 count/session +
       IP rate limit
  2c — Still not collected: accounts, per-user DB, slip uploads

Section 3 adds Vercel Analytics + Upstash to the third-party list.
Section 4 spells out opt-out paths (DNT, ad blocker, clear browsing
data).

Update timestamp bumped to 12 สิงหาคม 2569.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Verification Summary

After all 8 tasks:

1. ✅ `pnpm test` — 42 previous + 3 rateLimit-new + 7 upstash + 5 counter + 4 visitor-counter + 4 events = **65 tests total**
2. ✅ `pnpm lint` — no errors (including new ESLint restriction on `@/lib/analytics/upstash`)
3. ✅ Landing footer: `<VisitorCounter />` renders "ผู้เยี่ยมชม N คน" (or nothing if env vars missing locally)
4. ✅ Refresh landing → counter number does NOT change (sessionStorage flag)
5. ✅ 7 custom events fire at the right moments (verify in browser console via `window.va` or DevTools Network → beacon calls)
6. ✅ Privacy page reflects all 3 storage surfaces
7. ✅ Engine tests (37 golden snapshot etc.) unchanged and passing
8. ✅ Vercel deploy: after setting env vars, Vercel Analytics tab shows pageviews + events within ~5 min; Upstash console shows `hybrid-matrix:visits:total` incrementing

### User Manual Steps (out of implementation scope)

Before this plan actually shows numbers in production:
1. Sign up at upstash.com → create Redis DB (Singapore, Free tier)
2. Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. Add both to Vercel dashboard → project settings → Environment Variables (scope: Production + Preview + Development)
4. Vercel dashboard → project → Analytics tab → click Enable
5. Redeploy (either commit pushes new code, or hit Redeploy button)
