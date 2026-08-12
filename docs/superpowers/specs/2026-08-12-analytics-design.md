# Analytics & Public Counter — Design Specification

**Project:** Hybrid Matrix Lotto — Analytics extension
**Date:** 2026-08-12
**Status:** Approved — ready for implementation planning
**Tech Stack:** `@vercel/analytics` · `@upstash/redis` · Next.js 14 Route Handlers
**Deployment Target:** Vercel (Hobby plan free tier)

---

## 1. Overview

เพิ่ม 3 sub-features เพื่อให้เจ้าของ project เห็นการใช้งาน + ให้ผู้เยี่ยมชมเห็น social proof เล็กๆ:

1. **Owner Analytics** (Vercel Analytics — auto pageviews, referrer, geo, browser)
2. **Public Counter** (Upstash Redis — total visits counter แสดงที่ landing footer)
3. **Custom Funnel Events** (Vercel `track()` — hero → legal → dashboard → generate → copy)

โครงการนี้ **ไม่แตะ engine** (deterministic contract คงเดิม) และแยก analytics ออกจาก request path ของ `generateMatrix` — วิเคราะห์ล้มก็ไม่กระทบการคำนวณ

## 2. Goals & Non-Goals

### Goals
- Enable Vercel Analytics auto pageviews บนทุก route
- Track custom events ที่แต่ละ conversion step ของ funnel
- แสดง total visits counter ที่ landing footer (public)
- Anti-abuse: กัน counter inflation จาก refresh + IP spam
- Graceful degradation: Analytics/Upstash ล้ม → เว็บยังใช้งานได้ครบ
- อัปเดต `/privacy` ให้ตรงกับความจริงใหม่ (มี analytics แล้ว)

### Non-Goals (สำหรับ spec นี้)
- Real-time active user counter
- Daily unique visitor counter (แค่ total)
- Admin dashboard custom (ใช้ Vercel Analytics UI)
- Cookie consent banner (Vercel Analytics cookieless, Upstash counter cookieless — ไม่ต้อง)
- A/B testing framework
- Session recording

## 3. Architecture

### File Structure
```
lotto/
├── app/
│   ├── api/
│   │   └── counter/
│   │       └── route.ts             # GET total / POST hit
│   ├── layout.tsx                   # + <Analytics /> beacon
│   ├── page.tsx                     # + <VisitorCounter /> in footer + trackEvent hooks
│   └── privacy/page.tsx             # rewrite section 2, add section 2b
├── components/
│   ├── analytics/
│   │   └── VisitorCounter.tsx       # NEW — client, shows total from /api/counter
│   ├── gateway/
│   │   └── LegalCheckpoint.tsx      # + trackEvent('legal_accept')
│   └── dashboard/
│       ├── GenerateButton.tsx       # + trackEvent('matrix_generated')
│       ├── CopyButton.tsx           # + trackEvent('number_copied', {kind})
│       └── SupportSection.tsx       # + trackEvent('support_qr_open')
├── lib/
│   └── analytics/
│       ├── events.ts                # NEW — typed trackEvent wrapper
│       └── upstash.ts               # NEW — server-only Redis client
├── __tests__/
│   ├── analytics/
│   │   ├── events.test.ts
│   │   ├── upstash.test.ts
│   │   └── visitor-counter.test.tsx
│   └── api/
│       └── counter.test.ts
└── (docs, package.json unchanged)
```

### Isolation Rules
- `lib/analytics/upstash.ts` — `import "server-only"` guard
- `lib/analytics/events.ts` — client-safe (wraps `@vercel/analytics` client SDK)
- ESLint restricted-imports: `lib/analytics/upstash` blocked from `components/**`
- Engine + engine tests ห้ามพึ่ง analytics (analytics ล้ม → engine ยังทำงาน)

## 4. Sub 1 — Vercel Analytics Integration

### Package + Wiring
```bash
pnpm add @vercel/analytics
```

`app/layout.tsx`:
```tsx
import { Analytics } from "@vercel/analytics/react";
// ...
<body>
  {children}
  <Analytics />
</body>
```

**Auto-tracked (no additional code):**
- Pageviews: URL path (no query string)
- Referrer
- Country/City (via geoip; IP is discarded post-lookup)
- User agent → browser + OS
- Speed insights (First Contentful Paint, etc.)

### Free Tier Budget
- Hobby plan: **2,500 events/month** free
- 2 pageviews/user × ~40 users/day = ~2,400 events/mo → พอดี hobby
- ถ้าโตเกินจะขึ้น Pro ($20/mo, 100K events)

## 5. Sub 2 — Public Counter (Upstash Redis)

### Upstash Setup (User action, 1 time)
1. Sign up upstash.com (GitHub OAuth ก็ได้)
2. Create Database → type **Redis** → Region **Singapore** (nearest to Thai users) → Free tier
3. REST API tab → copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
4. Vercel dashboard → project → Settings → Environment Variables → paste both (scope: Production, Preview, Development)
5. Redeploy (Vercel triggers automatically after env var change)

### Package
```bash
pnpm add @upstash/redis
```

### `lib/analytics/upstash.ts`
```typescript
import "server-only";
import { Redis } from "@upstash/redis";

const TOTAL_KEY = "hybrid-matrix:visits:total";

let redis: Redis | null = null;
function getClient(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export async function readTotal(): Promise<number | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const v = await c.get<number>(TOTAL_KEY);
    return v ?? 0;
  } catch {
    return null;
  }
}

export async function incrementTotal(): Promise<number | null> {
  const c = getClient();
  if (!c) return null;
  try {
    return await c.incr(TOTAL_KEY);
  } catch {
    return null;
  }
}
```

### API Route: `app/api/counter/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { readTotal, incrementTotal } from "@/lib/analytics/upstash";
import { enforceRateLimit, getClientIp } from "@/lib/actions/rateLimit";

export async function GET() {
  const total = await readTotal();
  if (total === null) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ total });
}

export async function POST(req: NextRequest) {
  // Anti-abuse: 5 hits/min/IP (tighter than generateMatrix's 20)
  try {
    enforceRateLimit(getClientIp(), { limit: 5, windowMs: 60_000, bucket: "counter" });
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

*Note — code migration required:* the existing `lib/actions/rateLimit.ts` currently exposes `enforceRateLimit(ip: string): void` with hard-coded `WINDOW_MS=60_000` and `MAX_PER_WINDOW=20`, backed by a single in-memory `Map<string, number[]>`. To support both the existing `generateMatrix` cap (20/min) and the counter's tighter cap (5/min) without cross-contamination, extend the module to:

```typescript
type RateLimitOptions = { limit?: number; windowMs?: number; bucket?: string };
export function enforceRateLimit(ip: string, opts?: RateLimitOptions): void;
```

- Default `limit=20`, `windowMs=60_000`, `bucket="default"` — keeps `generateMatrix` behavior unchanged (no call-site edit needed there).
- Replace the single `Map` with `Map<string, Map<string, number[]>>` keyed by `bucket → ip → timestamps`, or equivalently namespace the key as `` `${bucket}:${ip}` ``. Simplest = key namespacing.
- Update `__resetRateLimiterForTests()` to clear the whole map.
- Existing rateLimit test suite must still pass unchanged (calls without opts default to the same behavior).

The migration is a small self-contained task in the implementation plan; the counter API route above assumes the extended signature is available.

### Route path convention
- `GET /api/counter` — read total (safe to call any time)
- `POST /api/counter` — increment (rate-limited)

*Alternative considered but rejected:* separate `/api/counter/hit` — adds a segment without value.

### `<VisitorCounter />` Component
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
      // private mode / cookies blocked — behave as read-only
      alreadyCounted = true;
    }

    const url = "/api/counter";
    const opts: RequestInit = alreadyCounted
      ? { method: "GET" }
      : { method: "POST" };

    fetch(url, opts)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { total: number }) => {
        if (!alreadyCounted) {
          try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
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

### Placement
`app/page.tsx` landing footer (แถวเดียวกับ /about /privacy links):
```tsx
<footer className="... flex ... gap-6 ...">
  <Link href="/about">เกี่ยวกับสูตร</Link>
  <span>·</span>
  <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
  <span>·</span>
  <VisitorCounter />
</footer>
```

*ไม่แสดงบน /dashboard, /about, /privacy* — Landing เท่านั้น (per user decision)

### Anti-Abuse Summary
| Layer | Mechanism | Bypass? |
|-------|-----------|---------|
| Client sessionStorage | Prevent refresh inflation | Yes (DevTools clear, private mode) |
| Server per-IP rate limit | 5 POST/min/IP | Requires botnet with distinct IPs |
| Read cost | Free (GET doesn't increment) | — |

Trade-off: counter สะท้อน "หน่วยหลัก" ของการเยี่ยมชมโดยประมาณ ไม่ใช่ตัวเลขทางบัญชี — สอดคล้องกับ semantic "social proof" ของ badge

## 6. Sub 3 — Custom Event Vocabulary

### `lib/analytics/events.ts`
```typescript
import { track } from "@vercel/analytics";

type EventMap = {
  hero_enter:        undefined;
  legal_back:        undefined;
  legal_accept:      undefined;
  matrix_generated:  { targetDate: string };
  number_copied:     { kind: "prize1" | "adjacent" | "front3" | "back3" | "back2" };
  support_qr_open:   undefined;
  picker_scrollback: undefined;
};

export function trackEvent<K extends keyof EventMap>(
  name: K,
  props?: EventMap[K],
): void {
  track(name, props as Record<string, string> | undefined);
}
```

### Instrumentation Points

| Event | Where | When |
|-------|-------|------|
| `hero_enter` | `app/page.tsx` | Click "เข้าสู่ระบบวิเคราะห์" |
| `legal_back` | `app/page.tsx` | Click "← กลับ" from legal step |
| `legal_accept` | `components/gateway/LegalCheckpoint.tsx` | Inside `onAccept` handler (before router.push) |
| `matrix_generated` | `components/dashboard/GenerateButton.tsx` | On successful `generateMatrix()` promise resolve |
| `number_copied` | `components/dashboard/CopyButton.tsx` | On successful clipboard write |
| `support_qr_open` | `components/dashboard/SupportSection.tsx` | On toggle open (not close) |
| `picker_scrollback` | `components/dashboard/DashboardClient.tsx` | Click "↑ เลือกงวดใหม่" |

### `number_copied` kind mapping
- `prize1` — FeaturedPrize main number copy
- `adjacent` — either of the 2 adjacent numbers  
- `front3` — either of front-3 set
- `back3` — either of back-3 set
- `back2` — back-2 number

Requires passing `kind` prop down from parent (ResultCard/FeaturedPrize) to CopyButton.

## 7. Privacy Policy Updates — `app/privacy/page.tsx`

### Section 2 (ข้อมูลที่ไม่เก็บ) — REMOVE these lines
```
- ไม่มี Google Analytics / ไม่มี tracking pixel
```

### Section 2 — RENAME to "2a. ข้อมูลที่เก็บเพิ่มเติมผ่าน Analytics" and rewrite

```
2. ข้อมูลที่เก็บผ่าน Vercel Analytics

Vercel Analytics (cookieless) เก็บข้อมูลต่อไปนี้ต่อการเยี่ยมชม:
- URL path ที่เยี่ยมชม (ไม่มี query string)
- Referrer (เว็บที่นำมา)
- Country/City โดยประมาณ จาก IP (IP ถูกทิ้งหลัง lookup — ไม่เก็บถาวร)
- Browser + OS จาก User-Agent
- Custom events: ปุ่ม/action ที่ user ทำ (เช่น matrix_generated, number_copied)
- ใน matrix_generated: target date ที่ user ป้อน (input parameter ไม่ใช่ PII)

⚙️ Cookieless: ไม่มี cookie สำหรับ analytics ไม่ track cross-site
Opt-out: browser DoNotTrack header, ad blocker, uBlock Origin
```

### ADD Section 2b — Public Counter
```
2b. Public Visitor Counter (Upstash Redis)

Counter รวมของการเยี่ยมชมหน้าหลัก:
- เก็บแค่ integer เดียว (จำนวนรวม) — ไม่ระบุตัวตนใคร
- ไม่เก็บ IP, ไม่เก็บ timestamp, ไม่เก็บ session id
- นับสูงสุด 1 ครั้ง/browser session ผ่าน sessionStorage
- Server-side rate limit 5 hits/นาที/IP ป้องกันการ spam
```

### Section 3 (Third-Party Services) — ADD entries
```
- Vercel Analytics (analytics)
- Upstash Redis (persistent storage for visitor counter, hosted in Singapore)
```

### Section 4 — Update
```
สิทธิ์ PDPA:
- Opt-out analytics: เปิด DoNotTrack ใน browser หรือใช้ ad blocker
- ล้าง counter session flag: clear browsing data
- ระบบไม่มี persistent PII → ไม่มี right-to-access / right-to-delete request ที่จะรับ
```

## 8. Testing Strategy (Vitest)

### Unit tests
```
__tests__/
├── analytics/
│   ├── events.test.ts               # trackEvent → mock track called with correct args
│   ├── upstash.test.ts              # mock @upstash/redis; verify INCR/GET calls, null on missing env
│   └── visitor-counter.test.tsx     # 3 states: loading → shown / loading → hidden
└── api/
    └── counter.test.ts              # GET returns total; POST increments; rate limit; 503 on error
```

### Test isolation
- Mock `@vercel/analytics` — verify `track()` called with correct name + props
- Mock `@upstash/redis` Redis class — verify INCR/GET called with correct key
- Mock `fetch` in VisitorCounter tests
- `enforceRateLimit` uses `__resetRateLimiterForTests` — reuse existing pattern

### Regression guarantee
- Engine tests (37 existing + rate limit 4 = 42) must remain green
- No analytics import from `lib/engine/**`

### Manual verification
1. Landing footer shows "ผู้เยี่ยมชม N คน" after page load
2. Refresh → number does NOT increment (sessionStorage flag)
3. Open incognito → +1
4. After deploy: Vercel Analytics tab shows pageviews + custom events within ~5 min
5. Upstash console: key `hybrid-matrix:visits:total` shows expected integer

## 9. Deployment Order

**Pre-code (user actions):**
1. Sign up Upstash, create Redis DB (Singapore, Free tier)
2. Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. Add both to Vercel env vars (Production + Preview + Development)

**Post-code (auto):**
4. Push to main → Vercel auto redeploy
5. Enable Vercel Analytics tab (one click)
6. Verify: visit landing, check counter increments, check Analytics dashboard within 5 min

## 10. Failure Modes & Rollback

| Failure | Behavior | Impact |
|---------|----------|--------|
| Upstash env vars missing | `readTotal()` returns null → API 503 → `<VisitorCounter />` hidden | Landing renders without badge; no other pages affected |
| Upstash service down | Same as above (fetch catches, returns null) | Same |
| Vercel Analytics blocked (ad blocker / DNT) | `track()` no-op (Vercel SDK handles) | Owner loses that visit's data; user sees no error |
| `@vercel/analytics` package error | React error boundary catches; page still renders | Analytics beacon fails but content OK |
| Rate limit false positive | User's POST rejected 429 | Counter doesn't increment for that user; GET still works |

**Rollback:** ลบ env vars ที่ Vercel + redeploy → counter hide + Analytics no-op → เว็บกลับเป็นก่อน analytics ทันที (no code revert needed)

## 11. Open Decisions Locked

| ID | Question | Decision |
|----|----------|----------|
| A1 | Analytics scope | ทั้ง 3 (owner dashboard + public counter + funnel events) |
| A2 | Provider สำหรับ owner dashboard | Vercel Analytics (free tier 2.5K events/mo) |
| A3 | Counter storage | Upstash Redis (Singapore, Free tier) |
| A4 | Counter metric | Total visits เท่านั้น (ไม่ daily, ไม่ active) |
| A5 | Counter placement | Landing footer เท่านั้น |
| A6 | Counter dedupe | sessionStorage (client) + IP rate limit 5/min (server) |
| A7 | Consent banner | ไม่ทำ (Vercel Analytics + Upstash counter ทั้งคู่ cookieless) |

---

**Next step:** Implementation plan via `superpowers:writing-plans` skill
