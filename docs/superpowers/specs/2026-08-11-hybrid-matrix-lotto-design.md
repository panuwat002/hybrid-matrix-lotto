# The Ultimate Hybrid Matrix — Design Specification

**Project:** Lotto Analyzer (God-Tier Hybrid Matrix)
**Date:** 2026-08-11
**Status:** Approved — ready for implementation planning
**Tech Stack:** Next.js 14+ (App Router, TypeScript, RSC) · Tailwind CSS 3 · `decimal.js` · Vitest
**Deployment Target:** Vercel (serverless)

---

## 1. Overview

Web application สำหรับประมวลผลชุดตัวเลขสลากกินแบ่งด้วย **Deterministic Hybrid Algorithm** ที่ผสมสถิติย้อนหลังกับสมการทางคณิตศาสตร์ (Golden Ratio, Pi, Euler's constant) ผลลัพธ์ต้อง reproducible 100% ต่อ input เดียวกัน โดยไม่มี floating-point error

Positioning: **เพื่อความบันเทิงและการเรียนรู้ Data Science เท่านั้น** — ไม่รับประกันผลรางวัลใดๆ

## 2. Goals & Non-Goals

### Goals
- ผลิตชุดตัวเลข (รางวัลที่ 1, ข้างเคียง, เลขหน้า 3 ตัว ×2, เลขท้าย 3 ตัว ×2, เลขท้าย 2 ตัว) จากวันที่เป้าหมาย
- ทุกการคำนวณเป็น **pure deterministic function** — same input → same output ทุกครั้ง
- Precision 50 หลักผ่าน `decimal.js` (ไม่มี native `Number` arithmetic)
- ลอจิกทั้งหมดรันบน server-side, ไม่รั่วสูตรไป client bundle
- UI Matrix/Sci-Fi theme (ไทยล้วน), copy-to-clipboard ทุกชุด, tension score %

### Non-Goals (MVP)
- Real payment gateway integration
- Real slip OCR / verification (mockup UI เท่านั้น)
- User accounts / authentication ระดับ database
- Historical data auto-update จาก GLO
- Analytics, i18n, PWA, rate limiting

## 3. Architecture

### File Structure
```
lotto/
├── app/
│   ├── layout.tsx                    # Root layout (font, theme, global CSS)
│   ├── page.tsx                      # Gateway/Landing (Server Component)
│   ├── dashboard/page.tsx            # Result Dashboard (guarded)
│   └── globals.css                   # Tailwind + Matrix theme tokens
├── components/
│   ├── gateway/
│   │   ├── LegalCheckpoint.tsx       # Clickwrap + Disclaimer (Client)
│   │   ├── PaymentMockup.tsx         # QR + slip upload UI mockup (Client)
│   │   └── UnlockButton.tsx          # ปุ่มยืนยันปลดล็อก (Client)
│   ├── dashboard/
│   │   ├── DateSelector.tsx          # เลือกวันงวด (Client)
│   │   ├── ResultCard.tsx            # การ์ดแสดงตัวเลข (Server-safe)
│   │   ├── CopyButton.tsx            # Copy to clipboard (Client)
│   │   └── TensionMeter.tsx          # แสดง % Statistical Tension
│   └── ui/                           # Primitives (button, card, etc.)
├── lib/
│   ├── engine/
│   │   ├── constants.ts              # φ, π, e (Decimal precision 50)
│   │   ├── statisticalTension.ts     # Phase 1
│   │   ├── cosmicMultiplier.ts       # Phase 2
│   │   ├── matrixExtractor.ts        # Phase 3
│   │   └── index.ts                  # calculateHybridMatrix (orchestrator)
│   ├── actions/
│   │   └── generateMatrix.ts         # "use server" — entry point
│   ├── data/
│   │   └── historical.json           # 240 งวดย้อนหลัง
│   ├── session/
│   │   └── unlock.ts                 # httpOnly cookie helper
│   └── types.ts                      # DrawDate, MatrixResult, TensionScore
├── docs/superpowers/specs/           # This spec + future ones
└── __tests__/
    ├── engine/                       # Determinism-critical tests
    └── actions/                      # Server Action tests
```

### Isolation Rules
- ทุกไฟล์ใน `lib/engine/**` และ `lib/actions/**` **ต้อง import ได้เฉพาะจาก server context**
- ESLint `no-restricted-imports` block `lib/engine/**` จากไฟล์ที่มี `"use client"` directive
- Server Action `generateMatrix` เป็นทางเดียวที่ client เข้าถึง engine

## 4. Data Model

```typescript
// lib/types.ts

export type DrawDate = string;   // "DDMMYYYY" in BE, e.g. "16082569"

export type MatrixResult = {
  targetDate: DrawDate;
  firstPrize: string;              // "915472"
  adjacent: [string, string];      // ["915471", "915473"] (wrap mod 10^6)
  frontThree: [string, string];    // ["123", "456"]
  backThree: [string, string];     // ["789", "012"]
  backTwo: string;                 // "34"
  tensionScore: number;            // 0.00 - 100.00 (2 decimals)
};

export type HistoricalDraw = {
  date: string;                    // ISO or DDMMYYYY
  firstPrize: string;              // 6-digit string
};
```

## 5. Engine Specification

### Phase 1 — Statistical Tension Seed (S_T)

**Input:** `historical.json` = `HistoricalDraw[]` (240 งวด × 10 ปี)
**Output:** `S_T: Decimal` where `S_T ∈ [0, 1)`

**Algorithm:**
```
สำหรับแต่ละหลัก d ∈ {0..9}:
  freq[d]    = จำนวนครั้งที่ d ปรากฏในทุกตำแหน่งของ firstPrize ทุกงวด
  gap[d]     = จำนวนงวดตั้งแต่ d ปรากฏล่าสุด (นับจากงวดล่าสุด)
  tension[d] = (freq[d] - mean)² × (gap[d] + 1)
             = variance-weighted × gap
  
Sort digits โดย tension descending; **tie-break:** digit value ascending
เลือก top-3 → concat ตามลำดับผลการ sort → 3-digit integer T (เช่น [7,3,5] → 735)
S_T = Decimal(T).div(1000)          // normalize เข้า [0, 1)
```

**Determinism:** ข้อมูล historical ล็อกใน git → ทุก build ให้ S_T เดียวกัน

### Phase 2 — Cosmic Multiplier

**Constants (Decimal precision 50, defined once in `constants.ts`):**
```
φ = 1.61803398874989484820458683436563811772030917980576
π = 3.14159265358979323846264338327950288419716939937511
e = 2.71828182845904523536028747135266249775724709369996
```

**Formula:**
```
X = (D × S_T) × φ³ × π
```
- `D` = `Decimal(targetDate)` (integer literal ของ date, e.g. `16082569`)
- `S_T` = จาก Phase 1
- ทุก operation คือ `Decimal.mul()` / `Decimal.pow()`
- Result `X` เก็บ precision 50 ต่อ

### Phase 3 — Matrix Extraction

> **Note:** ทุกสูตรด้านล่างใช้ `X` ตัวเดียวกัน = **Decimal ดิบจาก Phase 2** (ก่อน mod หรือ floor ใดๆ) คงค่า precision 50 หลัก

| # | ชุดตัวเลข | สูตร |
|---|-----------|------|
| 1 | **รางวัลที่ 1** (Prize1) | `⌊X × π⌋ mod 1,000,000` (6 หลัก, zero-padded) |
| 2 | **ข้างเคียงรางวัลที่ 1** | `[(Prize1 - 1 + 10^6) mod 10^6, (Prize1 + 1) mod 10^6]` |
| 3 | **เลขท้าย 2 ตัว** | `⌊X⌋ mod 100` (2 หลัก, zero-padded) |
| 4a | **เลขหน้า 3 ตัว — ชุด 1** | `⌊X × 10^15⌋ mod 1000` (ดึงหลัก 13-15 ของเศษทศนิยม) |
| 4b | **เลขหน้า 3 ตัว — ชุด 2** | `⌊X × e⌋ mod 1000` |
| 5a | **เลขท้าย 3 ตัว — ชุด 1** | `⌊√X⌋ mod 1000` (`Decimal.sqrt()`) |
| 5b | **เลขท้าย 3 ตัว — ชุด 2** | `⌊X^(1/3)⌋ mod 1000` (`X.pow(Decimal(1).div(3))`) |

**Zero-padding:** ทุก output แปลงเป็น string แล้ว `padStart(len, '0')`

**Tension Score for display:**
```
tensionScore = S_T.mul(100).toDecimalPlaces(2).toNumber()   // 0.00 - 100.00
```

### Orchestrator

```typescript
// lib/engine/index.ts
export function calculateHybridMatrix(targetDate: DrawDate): MatrixResult {
  const S_T = computeStatisticalTension(HISTORICAL);
  const X   = cosmicMultiplier(targetDate, S_T);
  return extractMatrix(targetDate, X, S_T);
}
```

Pure function · deterministic · no side effects · fully testable

## 6. UI/UX Flow

```
[1] "/"  Landing (Hero, "เข้าสู่ระบบวิเคราะห์")
   ↓
[2] Legal Checkpoint (Clickwrap checkbox + disclaimer)
   ↓
[3] Payment Mockup (QR + upload UI; "ยืนยันการสนับสนุน" → set unlock cookie)
   ↓
[4] "/dashboard"  Dashboard (guarded by unlock cookie)
    - Date Picker (default งวดถัดไป)
    - "รันการวิเคราะห์" → invoke Server Action generateMatrix
    - Result cards: Prize1 + neighbors, Front3×2, Back3×2, Back2
    - Each card: CopyButton + TensionMeter %
    - "วิเคราะห์งวดใหม่" (เปลี่ยนวัน, re-run)
```

### Visual Theme (Matrix / Sci-Fi)
- Background: `#0a0a0f` + subtle grid overlay
- Numbers accent: matrix green `#00ff9c`
- Tension meter: cyan glow `#00d4ff`
- Fonts: `JetBrains Mono` (numbers) · `IBM Plex Sans Thai` (Thai text)
- Effects: text-shadow glow บนเลขรางวัล, hover animations แบบเบา

### Component Contracts

| Component | Type | Props | Responsibility |
|-----------|------|-------|----------------|
| `LegalCheckpoint` | Client | `onAccept: () => void` | Manage checkbox, enable next button |
| `PaymentMockup` | Client | `onUnlock: () => void` | QR + upload UI, set unlock cookie via server action |
| `DateSelector` | Client | `value, onChange` | Thai calendar → `DrawDate` string |
| `ResultCard` | Server-safe | `title, numbers[], tension` | Render styled card |
| `CopyButton` | Client | `text` | `navigator.clipboard.writeText`, toast |
| `TensionMeter` | Server-safe | `score` (0-100) | Progress bar/gauge |

## 7. Server Action Contract

```typescript
// lib/actions/generateMatrix.ts
"use server";

import { cookies } from "next/headers";

export async function generateMatrix(
  targetDate: DrawDate
): Promise<MatrixResult> {
  // 1. Guard
  const unlocked = cookies().get("lotto_unlock")?.value === "1";
  if (!unlocked) throw new Error("UNLOCKED_REQUIRED");
  
  // 2. Validate format (8-digit numeric string)
  if (!/^\d{8}$/.test(targetDate)) throw new Error("INVALID_DATE");
  
  // 3. Compute
  return calculateHybridMatrix(targetDate);
}
```

### Unlock Session
- Cookie: `lotto_unlock=1`, `httpOnly`, `sameSite=lax`, session-scoped
- Set โดย server action `confirmUnlock()` หลังกด "ยืนยันการสนับสนุน"
- Dashboard page ตรวจ cookie ก่อน render; ถ้าไม่มี → `redirect("/")`

## 8. Testing Strategy (Vitest)

```
__tests__/
├── engine/
│   ├── constants.test.ts             # φ, π, e ครบ 50 หลัก + Decimal type
│   ├── statisticalTension.test.ts    # fixed dataset → fixed S_T; S_T ∈ [0,1)
│   ├── cosmicMultiplier.test.ts      # (D, S_T) เดียวกัน → X เดียวกัน
│   ├── matrixExtractor.test.ts       # แต่ละสูตรถูกต้อง + zero-padding
│   ├── wrapAround.test.ts            # Prize1=000000 → adjacent [999999, 000001]
│   └── determinism.test.ts           # ⭐ Golden snapshot 5 dates
└── actions/
    └── generateMatrix.test.ts        # unlock guard + full pipeline
```

**Golden Snapshot Test (critical):**
Hardcode 5 target dates → run engine → lock expected `MatrixResult` เป็น constants. ใครก็ตามที่ refactor engine โดยเผลอทำให้ผลเปลี่ยน จะเห็น test fail ทันที

**UI tests deferred** — MVP เน้น engine correctness ก่อน

## 9. Determinism Enforcement

| Layer | Measure |
|-------|---------|
| Code | ESLint `no-restricted-imports` block `Math.random`, `Date.now`, `crypto.randomBytes` ใน `lib/engine/**` |
| Config | `Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP })` โหลดครั้งเดียวใน `constants.ts` |
| Data | `data/historical.json` versioned in git, ไม่ fetch runtime |
| Test | Golden snapshot 5 dates |
| Runtime | Server Action ใช้ cookies เพื่อ guard เท่านั้น ไม่ให้เข้าไปในการคำนวณ |

## 10. Deployment (Vercel)

| ประเด็น | Solution |
|--------|---------|
| Cold start | Server Action + static JSON = warm ในไม่กี่ ms |
| Function size | `decimal.js` ~40KB + JSON ~50KB → well under limit |
| Determinism บน serverless | ✅ Pure function + no state → ทุก instance ให้ผลเดียวกัน |
| Region | Default (auto) |
| Env vars | ไม่จำเป็นสำหรับ MVP |

**`next.config.js` (minimal):**
```js
module.exports = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};
```

## 11. Security Recap

- ✅ ทุก formula อยู่ใน `lib/engine/**` → import โดย Server Action เท่านั้น
- ✅ Client bundle ไม่มี `decimal.js` (tree-shake ตัดออก เพราะไม่ถูก import จาก client)
- ✅ ESLint enforcement บน import path
- ✅ Server Action = POST-only, CSRF protected โดย Next.js built-in
- ✅ Unlock cookie = httpOnly, sameSite=lax

## 12. Open Decisions Locked

| ID | Question | Decision |
|----|----------|----------|
| Q1 | Adjacent boundary (Prize1=000000/999999) | Wrap-around mod 10^6 |
| Q2 | "เศษทศนิยมช่วงกลาง" for Front-3 Set 1 | `⌊X × 10^15⌋ mod 1000` |
| Q3 | Cube root implementation | `X.pow(Decimal(1).div(3))` (native `decimal.js`) |

---

**Next step:** Implementation plan via `superpowers:writing-plans` skill
