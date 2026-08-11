# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปิด 11 findings จาก Cyber Security Panel (Schneier/Grugq/Shortridge) — คุมด้าน headers, rate limit, cookie hardening, disclosure, dependency hygiene, และ epistemic transparency ให้ Hybrid Matrix พร้อม deploy ระดับ production ที่ไม่ทำให้ตัวเอง (หรือ user) เสียหาย

**Architecture:** งานส่วนใหญ่คือ add layers รอบ engine ที่มีอยู่ — ไม่แตะ engine (deterministic contract ห้ามพัง) โดยเน้น: (1) HTTP security headers ผ่าน Next.js config, (2) in-action rate limiter (per-warm-instance in-memory Map, ระบุข้อจำกัดชัดใน docs), (3) session cookie ที่มี maxAge, (4) ปลูก transparency docs (`/about` เพิ่ม, `/privacy` ใหม่, `.well-known/security.txt`), (5) runbook สำหรับ destructive action (git history scrub) ให้ user รันเอง — เพราะ history rewrite ห้าม auto

**Tech Stack:** Next.js 14 (headers config + middleware), Vitest (test), Vercel deployment target — ไม่เพิ่ม external dependency (rate limit ใช้ in-memory Map, ไม่พึ่ง @upstash/ratelimit หรือ Vercel KV)

## Global Constraints

- **ห้ามแตะ `lib/engine/**`** — deterministic contract + golden snapshot lock ไว้ ห้ามพัง 37 tests เดิม
- **ห้าม auto-execute destructive git operations** (`filter-repo`, `push --force`, `reset --hard`) — Task 8 คือ runbook เท่านั้น ให้ user รันเอง
- **`decimal.js` precision 50 คงเดิม** — Turing บอกเก็บไว้ก็ได้ (belt-and-suspenders)
- **ไม่เพิ่ม external dependency** เว้นแต่จำเป็นจริงๆ — MVP scope
- **Cookie config: httpOnly, sameSite=lax, path=/** — เดิม + เพิ่ม `maxAge`
- **UI language ไทยล้วน** — Privacy Policy + new sections
- **Vitest smoke** ต้อง pass ครบ 37 + new tests เดิมของ engine
- **Commit** ทุก task ด้วย Conventional Commits (`feat(security):`, `docs(security):`, `chore(security):`)

---

## File Structure

**New files:**
- `public/.well-known/security.txt` — RFC 9116 disclosure metadata
- `app/privacy/page.tsx` — Thai PDPA-aware Privacy Policy (Server Component)
- `docs/security/git-history-scrub-runbook.md` — user-executed procedure for PII scrub
- `docs/security/threat-model.md` — records the peer review consensus for future contributors
- `__tests__/actions/rateLimit.test.ts` — rate limiter unit tests
- `lib/actions/rateLimit.ts` — extracted rate limiter helper

**Modified files:**
- `next.config.js` — add `async headers()` for CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `lib/session/unlock.ts` — add `maxAge: 60*60*4` (4h session lifetime)
- `lib/actions/generateMatrix.ts` — wire `rateLimit(ip)` check before engine call
- `package.json` — add `audit` and `audit:fix` scripts
- `app/about/page.tsx` — expand "Honest Notes" section with cookie/enumerability/slip-mockup entries + link to /privacy
- `app/page.tsx` — footer with links to `/about` and `/privacy`
- `components/dashboard/DashboardClient.tsx` — add `/privacy` link in nav
- `README.md` — add "Security" section documenting scanning + disclosure

---

## Task 1: Cookie Hardening — maxAge + tighter helper

**Files:**
- Modify: `lib/session/unlock.ts`

**Interfaces:**
- Consumes: `cookies()` from `next/headers`
- Produces: `isUnlocked()`, `setUnlocked()` — same signatures, tighter cookie (`maxAge = 4h`)

- [ ] **Step 1.1: Update `lib/session/unlock.ts`**

```ts
import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "lotto_unlock";
const COOKIE_VALUE = "1";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

export function isUnlocked(): boolean {
  return cookies().get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export function setUnlocked(): void {
  cookies().set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
}
```

- [ ] **Step 1.2: Run existing tests to confirm no regression**

Run: `pnpm test __tests__/actions/generateMatrix.test.ts`
Expected: 3/3 pass (test mocks cookies so maxAge change doesn't affect it)

- [ ] **Step 1.3: Commit**

```bash
git add lib/session/unlock.ts
git commit -m "feat(security): cookie 4h maxAge + secure flag in production

Session cookie used to inherit browser-session behaviour (which
Chrome/Edge Restore Tabs can extend indefinitely). Now:
- maxAge: 4h — bounds practical exposure
- secure: true in production — HTTPS-only over the wire
- httpOnly / sameSite=lax / path=/ unchanged

Not a real auth control (documented as decorative in /about), but
tightens the incidental exposure surface.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: HTTP Security Headers via `next.config.js`

**Files:**
- Modify: `next.config.js`

**Interfaces:**
- Consumes: nothing
- Produces: HTTP response headers on every route via Next.js `async headers()`

- [ ] **Step 2.1: Update `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // Next.js hydration inline scripts
  "style-src 'self' 'unsafe-inline'",  // Tailwind inline styles
  "img-src 'self' data:",
  "font-src 'self' data:",             // self-hosted via next/font at build
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

module.exports = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};
```

- [ ] **Step 2.2: Start dev server and verify headers**

```bash
pnpm dev &   # or start in another terminal
sleep 5
curl -sI http://localhost:3000/ | grep -Ei "content-security|x-frame|x-content-type|referrer|permissions|strict-transport"
```

Expected: 6 header lines present. Note `Strict-Transport-Security` in dev is harmless (browser respects only over HTTPS in production).

- [ ] **Step 2.3: Run existing suite to catch regressions from CSP**

Run: `pnpm test`
Expected: 37/37 pass

- [ ] **Step 2.4: Verify app still loads in browser**

Manual: open `http://localhost:3000/` in browser, check DevTools console for CSP violations. Any `unsafe-inline` complaints would surface here.

- [ ] **Step 2.5: Commit**

```bash
git add next.config.js
git commit -m "feat(security): baseline HTTP security headers

Adds via next.config.js headers():
- Content-Security-Policy (self + inline for Next.js/Tailwind)
- X-Frame-Options: DENY (clickjacking)
- X-Content-Type-Options: nosniff (MIME confusion)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/mic/geolocation/payment all denied
- Strict-Transport-Security: 2 years, includeSubDomains, preload

'unsafe-inline' is required for Next.js hydration script and Tailwind
inline styles. A future task can migrate to nonces for stricter CSP.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: `security.txt` for Coordinated Disclosure

**Files:**
- Create: `public/.well-known/security.txt`

**Interfaces:**
- Consumes: nothing
- Produces: static file at `/.well-known/security.txt` (RFC 9116)

- [ ] **Step 3.1: Create `public/.well-known/security.txt`**

```
Contact: mailto:wat03555@gmail.com
Expires: 2027-08-11T00:00:00.000Z
Preferred-Languages: th, en
Canonical: https://YOUR-DOMAIN.example/.well-known/security.txt
Policy: https://YOUR-DOMAIN.example/privacy
```

*The engineer executing this task should replace `YOUR-DOMAIN.example` with the actual Vercel/custom domain if known, or leave placeholder and note in commit that domain must be edited before production deploy.*

- [ ] **Step 3.2: Verify file serves correctly**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000/.well-known/security.txt
```

Expected: file contents echoed verbatim, HTTP 200.

- [ ] **Step 3.3: Commit**

```bash
git add public/.well-known/security.txt
git commit -m "feat(security): security.txt (RFC 9116) for disclosure

Contact + expiry + language preferences so researchers who find
vulnerabilities know where to report. Canonical/Policy URLs use
placeholder domain — must be edited before production deploy.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Rate Limiting on `generateMatrix`

**Files:**
- Create: `lib/actions/rateLimit.ts`
- Create: `__tests__/actions/rateLimit.test.ts`
- Modify: `lib/actions/generateMatrix.ts`
- Modify: `__tests__/actions/generateMatrix.test.ts` (mock rate limiter + headers)

**Interfaces:**
- Consumes: `headers()` from `next/headers`
- Produces:
  - `getClientIp(): string` — reads `x-forwarded-for` or `x-real-ip`, falls back to "unknown"
  - `enforceRateLimit(ip: string): void` — throws `Error("RATE_LIMITED")` if over quota

- [ ] **Step 4.1: Write failing test**

`__tests__/actions/rateLimit.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { enforceRateLimit, __resetRateLimiterForTests } from "@/lib/actions/rateLimit";

describe("enforceRateLimit", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    vi.useFakeTimers();
  });

  it("allows up to 20 requests per minute per IP", () => {
    for (let i = 0; i < 20; i++) {
      expect(() => enforceRateLimit("1.2.3.4")).not.toThrow();
    }
  });

  it("rejects the 21st request within 60 seconds", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("1.2.3.4")).toThrow("RATE_LIMITED");
  });

  it("isolates per IP", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("5.6.7.8")).not.toThrow();
  });

  it("recovers after the window elapses", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("1.2.3.4");
    expect(() => enforceRateLimit("1.2.3.4")).toThrow();
    vi.advanceTimersByTime(60_001);
    expect(() => enforceRateLimit("1.2.3.4")).not.toThrow();
  });
});
```

- [ ] **Step 4.2: Run test → FAIL (module not found)**

Run: `pnpm test __tests__/actions/rateLimit.test.ts`
Expected: FAIL

- [ ] **Step 4.3: Implement `lib/actions/rateLimit.ts`**

```ts
import "server-only";
import { headers } from "next/headers";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

// In-memory per-warm-instance. Vercel serverless has multiple warm
// instances so this is a soft cap, not a strict one. For a strict
// cap use Vercel KV / @upstash/ratelimit. Documented in README.
const requestLog = new Map<string, number[]>();

export function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export function enforceRateLimit(ip: string): void {
  const now = Date.now();
  const prior = requestLog.get(ip) ?? [];
  const recent = prior.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    throw new Error("RATE_LIMITED");
  }
  recent.push(now);
  requestLog.set(ip, recent);
}

/** Test-only reset — do not call from application code. */
export function __resetRateLimiterForTests(): void {
  requestLog.clear();
}
```

- [ ] **Step 4.4: Run test → PASS**

Run: `pnpm test __tests__/actions/rateLimit.test.ts`
Expected: 4/4 pass

- [ ] **Step 4.5: Wire into `lib/actions/generateMatrix.ts`**

```ts
"use server";

import { calculateHybridMatrix } from "@/lib/engine";
import { isUnlocked } from "@/lib/session/unlock";
import { getClientIp, enforceRateLimit } from "./rateLimit";
import type { DrawDate, MatrixResult } from "@/lib/types";

export async function generateMatrix(
  targetDate: DrawDate,
): Promise<MatrixResult> {
  if (!isUnlocked()) throw new Error("UNLOCK_REQUIRED");
  enforceRateLimit(getClientIp());
  if (!/^\d{8}$/.test(targetDate)) throw new Error("INVALID_DATE");
  return calculateHybridMatrix(targetDate);
}
```

- [ ] **Step 4.6: Update `__tests__/actions/generateMatrix.test.ts` mocks**

Replace the existing `vi.mock("next/headers", ...)` block with:

```ts
const mockCookieValue = { current: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "lotto_unlock" && mockCookieValue.current
        ? { value: mockCookieValue.current }
        : undefined,
    set: () => {},
  }),
  headers: () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));

import { generateMatrix } from "@/lib/actions/generateMatrix";
import { __resetRateLimiterForTests } from "@/lib/actions/rateLimit";
```

Add at top of the `describe` block:

```ts
beforeEach(() => {
  mockCookieValue.current = undefined;
  __resetRateLimiterForTests();
});
```

Add new test:

```ts
it("throws RATE_LIMITED after 20 requests in 60s", async () => {
  mockCookieValue.current = "1";
  for (let i = 0; i < 20; i++) {
    await generateMatrix("16082569");
  }
  await expect(generateMatrix("16082569")).rejects.toThrow("RATE_LIMITED");
});
```

Note: the mock returned by `headers()` uses `Map` which has `.get()` — matches the shape `next/headers` provides.

- [ ] **Step 4.7: Run action tests**

Run: `pnpm test __tests__/actions/`
Expected: 8 tests total (3 original + 1 new + 4 rateLimit unit), all pass

- [ ] **Step 4.8: Also add user-facing error message in `GenerateButton.tsx`**

Modify `components/dashboard/GenerateButton.tsx`, replace the `onError` string switch:

```ts
onError(
  msg === "UNLOCK_REQUIRED"
    ? "ยังไม่ปลดล็อกระบบ"
    : msg === "INVALID_DATE"
      ? "รูปแบบวันที่ไม่ถูกต้อง"
      : msg === "RATE_LIMITED"
        ? "เรียกใช้บ่อยเกินไป ลองใหม่ในอีก 1 นาที"
        : "เกิดข้อผิดพลาด",
);
```

- [ ] **Step 4.9: Commit**

```bash
git add lib/actions/rateLimit.ts lib/actions/generateMatrix.ts __tests__/actions/rateLimit.test.ts __tests__/actions/generateMatrix.test.ts components/dashboard/GenerateButton.tsx
git commit -m "feat(security): rate limit generateMatrix at 20/min/IP

- lib/actions/rateLimit.ts: in-memory sliding-window per-IP limiter,
  20 requests / 60s (WINDOW_MS + MAX_PER_WINDOW constants)
- Wired into generateMatrix before engine call; picks IP from
  x-forwarded-for → x-real-ip → 'unknown'
- Vercel warm instances don't share memory so this is a soft cap; a
  future task can wire @upstash/ratelimit or Vercel KV for strict cap
- GenerateButton shows 'เรียกใช้บ่อยเกินไป ลองใหม่ในอีก 1 นาที' for
  the new error code
- Tests: 4 unit + 1 integration + all previous — all pass

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Dependency Scanning Script + README Section

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: pnpm
- Produces:
  - `pnpm audit` script (runs `pnpm audit --prod`)
  - `pnpm audit:full` (all deps including dev)
  - `pnpm outdated` (already built-in but documented)

- [ ] **Step 5.1: Update `package.json` scripts block**

```json
"scripts": {
  "dev": "next dev --turbo",
  "dev:webpack": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "audit": "pnpm audit --prod",
  "audit:full": "pnpm audit",
  "outdated": "pnpm outdated"
}
```

- [ ] **Step 5.2: Append "Security" section to `README.md`**

Add at end of `README.md`:

```md
## Security

### Dependency scanning

    pnpm audit         # prod deps only
    pnpm audit:full    # all deps
    pnpm outdated      # version drift check

Recommend running before every deploy. In CI, wire either
`pnpm audit --prod --audit-level high` (fails build on high+) or
GitHub Dependabot / renovate for scheduled PRs.

### Disclosure

Vulnerability reports: see `/.well-known/security.txt` at the deployed
domain, or `public/.well-known/security.txt` in the repo.

### Rate limit

`generateMatrix` is capped at 20 requests/minute/IP via an in-process
sliding window. Vercel warm instances don't share memory, so under
distributed load the effective cap is per-instance. For a strict cap,
wire Vercel KV or `@upstash/ratelimit`.

### Cookie

The `lotto_unlock` cookie is a soft gate, not authentication —
documented on `/about`. Setting it manually via DevTools bypasses
the legal checkpoint; this is by design of the MVP mockup.

### Threat model

Full peer review + threat model: `docs/security/threat-model.md`.
```

- [ ] **Step 5.3: Run `pnpm audit` to record baseline**

```bash
pnpm audit --prod 2>&1 | tail -20
```

Note the output in the commit message (e.g., "0 vulnerabilities found" or list them).

- [ ] **Step 5.4: Commit**

```bash
git add package.json README.md
git commit -m "chore(security): add audit scripts + README security section

- pnpm audit (prod), pnpm audit:full (all), pnpm outdated
- README 'Security' section: scanning, disclosure, rate limit,
  cookie caveats, pointer to threat-model.md

Baseline: <paste actual audit output here>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: `/privacy` Page (Thai PDPA-aware)

**Files:**
- Create: `app/privacy/page.tsx`

**Interfaces:**
- Consumes: nothing (static Server Component)
- Produces: `/privacy` route

- [ ] **Step 6.1: Create `app/privacy/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — Hybrid Matrix",
  description: "ข้อมูลที่ระบบเก็บและไม่เก็บ ตามหลัก Thai PDPA",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6 md:p-12">
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="font-thai text-sm text-matrix-cyan/80 transition hover:text-matrix-cyan"
        >
          ← หน้าหลัก
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-matrix-cyan/60">
          Hybrid Matrix
        </span>
      </nav>

      <h1 className="mb-2 font-mono text-3xl text-matrix-green drop-shadow-[0_0_10px_#00ff9c] md:text-4xl">
        นโยบายความเป็นส่วนตัว
      </h1>
      <p className="mb-10 font-thai text-sm text-matrix-cyan/80">
        อัปเดตล่าสุด: 11 สิงหาคม 2569 · สอดคล้อง PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)
      </p>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          1. ข้อมูลที่เก็บ
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • <b>Cookie <code className="text-matrix-cyan">lotto_unlock</code></b>{" "}
            — HttpOnly, SameSite=Lax, อายุ 4 ชั่วโมง เก็บสถานะยอมรับข้อตกลง
            (functional cookie)
          </li>
          <li>
            • <b>IP address</b> — ใช้เฉพาะสำหรับ rate limiting (20 req/นาที)
            เก็บใน memory ของ server เท่านั้น ไม่บันทึกลง log ถาวร
          </li>
        </ul>
      </section>

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

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          3. Third-Party Services
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • <b>Vercel</b> (hosting) — ได้ IP + User-Agent ตาม server log
            มาตรฐาน (ตาม Vercel Privacy Policy)
          </li>
          <li>
            • <b>Fonts</b> — self-hosted ผ่าน{" "}
            <code className="text-matrix-cyan">next/font</code> ในเวลา build
            ไม่ fetch จาก Google runtime → เบราว์เซอร์ user ไม่ติดต่อ Google
            โดยตรง
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          4. สิทธิ์ของคุณ (PDPA)
        </h2>
        <p className="font-thai text-sm leading-relaxed text-matrix-green/85">
          เนื่องจากระบบไม่บันทึกข้อมูลส่วนบุคคลลง persistent storage
          จึงไม่มีสิ่งที่ให้เข้าถึง แก้ไข หรือลบได้ ถ้าต้องการล้าง cookie
          กด clear browsing data ในเบราว์เซอร์
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          5. ติดต่อ
        </h2>
        <p className="font-thai text-sm leading-relaxed text-matrix-green/85">
          รายงานปัญหาความปลอดภัยหรือ privacy: ดูข้อมูลใน{" "}
          <code className="text-matrix-cyan">/.well-known/security.txt</code>
        </p>
      </section>

      <section className="border-t border-matrix-cyan/20 pt-6">
        <p className="font-thai text-xs text-matrix-green/60">
          เอกสารนี้เขียนโดยผู้พัฒนา ไม่ใช่ที่ปรึกษากฎหมาย —
          กรณีต้องการความมั่นใจทางกฎหมายเต็มรูปแบบ ควรปรึกษาผู้เชี่ยวชาญ PDPA
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 6.2: Verify route serves**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000/privacy | grep -o "นโยบายความเป็นส่วนตัว"
```

Expected: matches (page rendered).

- [ ] **Step 6.3: Commit**

```bash
git add app/privacy/
git commit -m "feat(privacy): Thai PDPA-aware privacy policy page

Server Component at /privacy. Sections:
1. What we collect (cookie, IP for rate limit only)
2. What we do NOT collect (analytics, accounts, DB, uploads)
3. Third-party services (Vercel hosting, self-hosted fonts)
4. PDPA rights (nothing persistent to access/delete)
5. Contact (via security.txt)

Notes: not legal advice; recommends consultation for full assurance.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Expand `/about` + Nav Links to `/privacy`

**Files:**
- Modify: `app/about/page.tsx`
- Modify: `app/page.tsx` (footer)
- Modify: `components/dashboard/DashboardClient.tsx` (nav)

**Interfaces:**
- Consumes: existing pages
- Produces: cross-linked pages + expanded honest-notes section

- [ ] **Step 7.1: Add security notes section to `/about`**

Modify `app/about/page.tsx` — after the "บันทึกความซื่อสัตย์" section and before "Reproducibility Guarantee":

```tsx
      <section className="mb-10 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="mb-4 font-thai text-lg text-red-300">
          บันทึกด้านความปลอดภัย (Security Notes)
        </h2>
        <dl className="space-y-4 font-thai text-sm">
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              Cookie ไม่ใช่ระบบยืนยันตัวตน
            </dt>
            <dd className="text-matrix-green/75">
              <code className="text-matrix-cyan">lotto_unlock</code>{" "}
              เป็น functional cookie แสดงว่าคุณยอมรับ disclaimer
              ไม่ได้เป็น authentication — ใครก็ตั้งเองใน DevTools ได้
              เป็น speed bump ไม่ใช่กำแพง
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              ตัวเลข deterministic = enumerable
            </dt>
            <dd className="text-matrix-green/75">
              เนื่องจากสูตรให้ผลลัพธ์เดียวกันเสมอสำหรับ input เดียวกัน
              ใครก็คำนวณล่วงหน้าทุกวันที่ที่เป็นไปได้เก็บเป็น static table
              ไม่มี &ldquo;secret&rdquo; ในระบบ — คุณสมบัตินี้เป็นไปตาม design
              (transparency)
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              การอัปโหลดสลิป (mockup)
            </dt>
            <dd className="text-matrix-green/75">
              หน้าอัปโหลดสลิปในเวอร์ชัน MVP <b>ไม่มีการประมวลผลจริง</b>{" "}
              — ไฟล์ที่คุณเลือกอยู่ในหน้าจอเบราว์เซอร์เท่านั้น
              ไม่ถูกส่งไปที่ server หรือ third-party ใดๆ
            </dd>
          </div>
        </dl>
        <p className="mt-4 font-thai text-xs text-matrix-cyan/70">
          ดู{" "}
          <Link href="/privacy" className="underline hover:text-matrix-cyan">
            นโยบายความเป็นส่วนตัว
          </Link>{" "}
          สำหรับรายละเอียดข้อมูลที่เก็บและไม่เก็บ
        </p>
      </section>
```

Add `import Link from "next/link";` at the top of the file (currently imports only `next` types).

- [ ] **Step 7.2: Add footer with links to `/about` and `/privacy` on landing `app/page.tsx`**

At the very end of `<main>` (after all `{step === ...}` blocks), add:

```tsx
      <footer className="mx-auto mt-16 flex max-w-2xl items-center justify-center gap-6 border-t border-matrix-cyan/15 pt-4 font-thai text-xs text-matrix-green/60">
        <Link href="/about" className="transition hover:text-matrix-cyan">
          เกี่ยวกับสูตร
        </Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="transition hover:text-matrix-cyan">
          นโยบายความเป็นส่วนตัว
        </Link>
      </footer>
```

Add `import Link from "next/link";` to the imports.

- [ ] **Step 7.3: Add `/privacy` link to Dashboard nav**

Modify `components/dashboard/DashboardClient.tsx` — inside the nav `<div className="flex items-center gap-4">`, before the wordmark span, add:

```tsx
          <Link
            href="/privacy"
            className="font-thai text-xs text-matrix-cyan/70 transition hover:text-matrix-cyan"
          >
            ความเป็นส่วนตัว
          </Link>
```

- [ ] **Step 7.4: Verify pages cross-link**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000/about | grep -o "นโยบายความเป็นส่วนตัว"
curl -s http://localhost:3000/ | grep -o "เกี่ยวกับสูตร\|นโยบายความเป็นส่วนตัว"
```

Expected: both matches.

- [ ] **Step 7.5: Run lint + tests**

Run: `pnpm lint && pnpm test`
Expected: lint clean, 37 + rate-limit tests all pass

- [ ] **Step 7.6: Commit**

```bash
git add app/about/page.tsx app/page.tsx components/dashboard/DashboardClient.tsx
git commit -m "feat(ui): expand /about with security notes + cross-link privacy

/about gains a red-bordered 'Security Notes' section (matching the
'What we do NOT do' style) documenting:
- cookie is decorative, not authentication
- deterministic output is enumerable — by design (transparency)
- slip upload is mockup — nothing leaves the browser

Landing footer + Dashboard nav both link to /privacy and /about so
the disclosure surface is discoverable from anywhere in the flow.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Threat Model Doc + Git History Scrub Runbook (User-Executed)

**Files:**
- Create: `docs/security/threat-model.md`
- Create: `docs/security/git-history-scrub-runbook.md`

**Interfaces:**
- Consumes: nothing
- Produces: reference documentation for maintainers

- [ ] **Step 8.1: Create `docs/security/threat-model.md`**

```md
# Threat Model — Hybrid Matrix

Consolidated from the Newton/Frege/Turing peer review (see spec Appendix A)
and the Schneier/Grugq/Shortridge cyber-security panel (2026-08-11).

## Assets

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| `public/support-qr.png` (PromptPay QR — bank account link) | High (PII) | `public/`, git history |
| Committer identity in git commits | Med (PII) | git history |
| App availability | Low-Med | Vercel |
| User trust via disclaimers | Med | `/about`, `/privacy` |
| Engine formula | Low | `lib/engine/**` (open by design) |

## Adversaries

| Adversary | Goal | Cost/Benefit | Priority |
|-----------|------|--------------|----------|
| Casual scraper | Grab computed numbers | Low/Low | Ignore |
| Cost-DoS abuser | Spam `generateMatrix` to burn Vercel budget | Med/Med | Mitigate (rate limit) |
| Doxxer / stalker | Extract owner's name + bank association | Low/High | Mitigate (git scrub, careful commits) |
| Determined attacker with bounty | (there is no bounty) | — | N/A |

## Attack Surface

- `/` (public) — legal clickwrap, no PII
- `/about`, `/privacy` (public) — static docs
- `/dashboard` (cookie-gated) — Server Action target
- Server Actions: `confirmUnlock` (sets cookie, no auth needed), `generateMatrix` (cookie-checked, rate-limited)
- `public/*` static assets — cache-controlled by Next.js/Vercel
- Git history — permanent record of past commits

## Controls in Place

- HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS) — `next.config.js`
- Rate limit 20 req/min/IP on `generateMatrix` — `lib/actions/rateLimit.ts`
- Cookie hardened: `httpOnly`, `sameSite=lax`, `secure` in prod, `maxAge=4h`
- Server-only guards on engine + session (via `server-only` npm package + ESLint restricted imports)
- Golden snapshot regression tests
- `security.txt` for disclosure

## Known Residual Risks (documented, not fixed)

- **Cookie is not authentication** — bypassable via DevTools; by design of the MVP disclaimer flow. Documented on `/about`.
- **Rate limit is per-warm-instance** — under distributed load the effective cap is per Vercel instance, not global. Migration path: `@upstash/ratelimit` + Vercel KV.
- **Enumerability** — deterministic output means all possible dates can be precomputed. By design; disclosed on `/about`.
- **QR + committer identity in git history** — see `git-history-scrub-runbook.md` for optional cleanup before making the repo public.

## Non-Assets (things we explicitly do NOT protect)

- The formula (transparent by design)
- Historical draw data (`lib/data/historical.json` — mock, deterministic)
- Dev-time configuration (`pnpm-workspace.yaml`, `.eslintrc.json`, etc.)
```

- [ ] **Step 8.2: Create `docs/security/git-history-scrub-runbook.md`**

```md
# Git History Scrub — Runbook (User-Executed)

**Status:** OPTIONAL — required only if making the repo public and you want
to remove personally-identifiable material from git history.

**⚠️ Destructive:** rewrites every commit SHA. If the repo has been cloned or
pushed anywhere, all consumers must rebase or re-clone.

## What might need scrubbing

| Item | Where | Commit(s) |
|------|-------|-----------|
| `public/support-qr.png` (PromptPay QR with bank link) | tracked file | `b40ae46` and any commit that touched it |
| Committer email `panuwat.sa@allcoco.co.th` | commit metadata | every commit |
| Committer name `Panuwat Sakuntem` | commit metadata | every commit |

## Prerequisites

Install `git-filter-repo` (the modern replacement for `git filter-branch`):

    pip install git-filter-repo
    # or on macOS: brew install git-filter-repo

## Procedure

**Step 1 — Backup**

    cd E:/Coword
    cp -r Lotto Lotto.bak-YYYYMMDD

**Step 2 — Remove the QR image from all history**

    cd Lotto
    git filter-repo --path public/support-qr.png --invert-paths

The QR file is gone from every past commit. It remains in the working tree
(untracked) — re-add it later if you still want it in HEAD but not in
history:

    git add public/support-qr.png
    git commit -m "feat(assets): re-add PromptPay QR post-history-scrub"

**Step 3 (optional) — Rewrite committer identity**

Create a `mailmap` file:

    # .mailmap
    Public Name <public@example.com> Panuwat Sakuntem <panuwat.sa@allcoco.co.th>

Then:

    git filter-repo --mailmap .mailmap

Every past commit's author/committer becomes `Public Name <public@example.com>`.

**Step 4 — Force-push (only if remote exists)**

    git push --force-with-lease origin main

⚠️ If anyone else has cloned this repo, they must:

    git fetch origin
    git reset --hard origin/main

Their local unmerged work will need to be rebased.

**Step 5 — Verify**

    git log --all --format="%an <%ae>" | sort -u
    # should show only the public identity

    git log --all --full-history --diff-filter=A -- public/support-qr.png
    # should be empty (or only the post-scrub re-add)

## Alternative: don't scrub, rotate

If scrubbing feels too heavy, an equivalent-security path is:
1. Retire the PromptPay account tied to `support-qr.png`
2. Generate a new QR for a new account
3. Replace the file in HEAD

The old QR remains in history but no longer links to an active account.
```

- [ ] **Step 8.3: Commit**

```bash
git add docs/security/
git commit -m "docs(security): threat model + git history scrub runbook

- threat-model.md: assets, adversaries, controls in place, residual
  risks — consolidated from both peer reviews so future maintainers
  don't re-derive it
- git-history-scrub-runbook.md: user-executed procedure for removing
  PII from git history using git-filter-repo. Not auto-executed by
  this plan — destructive to shared clones.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Final Verification Pass

**Files:** (verification only — no code changes)

- [ ] **Step 9.1: Full test suite**

Run: `pnpm test`
Expected: all previous engine tests (37) + rate limit (4) + action integration (1 new) = **42 passing**

- [ ] **Step 9.2: Lint**

Run: `pnpm lint`
Expected: clean

- [ ] **Step 9.3: Manual e2e sanity in browser**

Start `pnpm dev`, open browser to `http://localhost:3000`:
1. Landing loads, footer shows both links
2. Click `เกี่ยวกับสูตร` → `/about` shows Security Notes section, link to privacy works
3. Click `นโยบายความเป็นส่วนตัว` → `/privacy` shows all 5 sections
4. Back to landing, complete legal → dashboard
5. Nav shows `เกี่ยวกับสูตร`, `ความเป็นส่วนตัว`, `Hybrid Matrix` wordmark
6. Run analysis, get result
7. Repeat run 22 times fast → expect "เรียกใช้บ่อยเกินไป" on 21st+
8. Wait ~60s, retry → succeeds

- [ ] **Step 9.4: Header check with curl**

```bash
curl -sI http://localhost:3000/ | grep -Ei "content-security|x-frame|x-content-type|referrer|permissions|strict-transport"
curl -s http://localhost:3000/.well-known/security.txt
```

Expected: 6 security headers + security.txt contents.

- [ ] **Step 9.5: Final commit if anything drifted**

If verification surfaces a small drift (typo, missing import), fix and commit:

```bash
git add <files>
git commit -m "fix(security): <specific drift> found during final verification"
```

---

## Verification Summary

After all 9 tasks:

1. ✅ `pnpm test` — 42+ pass including rate limiter
2. ✅ `pnpm lint` — clean
3. ✅ 6 HTTP security headers present on every response
4. ✅ `/.well-known/security.txt` serves
5. ✅ `/privacy` and `/about` cross-linked from `/` and `/dashboard`
6. ✅ Cookie has `maxAge=4h` and `secure` in production
7. ✅ Rate limit enforces 20/min/IP with clear user-facing message
8. ✅ `docs/security/{threat-model,git-history-scrub-runbook}.md` present
9. ✅ `pnpm audit` script available; README documents it
