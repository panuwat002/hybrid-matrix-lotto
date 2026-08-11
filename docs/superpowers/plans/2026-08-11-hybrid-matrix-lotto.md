# Hybrid Matrix Lotto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง Next.js web app ที่คำนวณชุดตัวเลขสลากด้วย Deterministic Hybrid Matrix (สถิติย้อนหลัง + Golden Ratio + Pi + Euler's e) พร้อม UI Matrix theme, gateway ปลดล็อก และ Server Action ที่ไม่รั่วสูตรไปฝั่ง client

**Architecture:** Next.js App Router + TypeScript แยกฝั่งเป็น `lib/engine/**` (server-only, decimal.js precision 50) กับ UI (components/app) โดย Server Action เดียว `generateMatrix` เป็นสะพาน; หน้า `/dashboard` guard ด้วย httpOnly cookie; UI ธีม Matrix/Sci-Fi ไทยล้วน

**Tech Stack:** Next.js 14 · TypeScript · Tailwind CSS 3 · `decimal.js` · Vitest · Vercel

## Global Constraints

- **`Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP })`** ต้องเรียกครั้งเดียวใน `lib/engine/constants.ts` (import ที่อื่นห้าม override)
- **ห้ามใช้ `Math.random`, `Date.now`, `crypto.randomBytes`** ใน `lib/engine/**` — engine ต้อง pure deterministic 100%
- **`lib/engine/**` และ `lib/actions/**` ต้อง server-only** — ห้าม client component import ผ่าน barrel หรือ direct
- **ทุก output ตัวเลข zero-padded** ด้วย `.toString().padStart(len, '0')`
- **ภาษา UI ไทยล้วน**; ไม่มี translation layer
- **Theme colors ตายตัว:** bg `#0a0a0f`, number accent `#00ff9c`, tension accent `#00d4ff`
- **Fonts:** `JetBrains Mono` (ตัวเลข), `IBM Plex Sans Thai` (ข้อความไทย)
- **Historical data** = `lib/data/historical.json` (versioned, ล็อกใน git — ห้าม fetch runtime)
- **Cookie ปลดล็อก:** ชื่อ `lotto_unlock`, ค่า `"1"`, `httpOnly`, `sameSite=lax`, session-scoped
- **Test framework:** Vitest; ทุก engine module ต้อง test-first (TDD)
- **UI tests deferred** — MVP เน้น engine correctness; verification UI = manual (ระบุใน task)
- **Commit หลังทุก task**; commit message ใช้ Conventional Commits (`feat:`, `test:`, `chore:`, ...)

---

## File Structure (produced by this plan)

```
lotto/
├── app/
│   ├── layout.tsx                       # Root layout + fonts + theme
│   ├── globals.css                      # Tailwind + Matrix tokens
│   ├── page.tsx                         # Landing + Legal + Payment (guarded flow)
│   └── dashboard/page.tsx               # Dashboard (guarded)
├── components/
│   ├── gateway/
│   │   ├── LegalCheckpoint.tsx          # Checkbox + disclaimer (Client)
│   │   ├── PaymentMockup.tsx            # QR + upload UI (Client)
│   │   └── UnlockButton.tsx             # ยืนยัน → server action (Client)
│   └── dashboard/
│       ├── DateSelector.tsx             # เลือกวัน (Client)
│       ├── GenerateButton.tsx           # เรียก server action (Client)
│       ├── ResultCard.tsx               # การ์ดตัวเลข (Server-safe)
│       ├── CopyButton.tsx               # Copy to clipboard (Client)
│       └── TensionMeter.tsx             # แสดง % (Server-safe)
├── lib/
│   ├── engine/
│   │   ├── constants.ts                 # PHI, PI, E (Decimal)
│   │   ├── statisticalTension.ts        # Phase 1
│   │   ├── cosmicMultiplier.ts          # Phase 2
│   │   ├── matrixExtractor.ts           # Phase 3
│   │   └── index.ts                     # calculateHybridMatrix
│   ├── actions/
│   │   ├── generateMatrix.ts            # "use server" — matrix
│   │   └── confirmUnlock.ts             # "use server" — set cookie
│   ├── data/
│   │   └── historical.json              # 240 draws (deterministic seed)
│   ├── session/
│   │   └── unlock.ts                    # cookie helpers (server-only)
│   └── types.ts                         # DrawDate, MatrixResult, HistoricalDraw
├── scripts/
│   └── seed-historical.mjs              # ผลิต historical.json (dev-only)
├── __tests__/
│   ├── engine/
│   │   ├── constants.test.ts
│   │   ├── statisticalTension.test.ts
│   │   ├── cosmicMultiplier.test.ts
│   │   ├── matrixExtractor.test.ts
│   │   ├── wrapAround.test.ts
│   │   └── determinism.test.ts          # ⭐ Golden snapshot
│   └── actions/
│       └── generateMatrix.test.ts
├── docs/superpowers/{specs,plans}/
├── .eslintrc.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (placeholder — จะทำจริงใน Task 9)
- Create: `app/globals.css`
- Create: `__tests__/smoke.test.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: (nothing)
- Produces: Working Next.js dev environment; `pnpm test` และ `pnpm dev` ทำงานได้

- [ ] **Step 1.1: สร้าง `package.json`**

```json
{
  "name": "hybrid-matrix-lotto",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "decimal.js": "^10.4.3",
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.5",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 1.2: สร้าง `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 1.3: สร้าง `next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
};
```

- [ ] **Step 1.4: สร้าง `postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 1.5: สร้าง `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          bg: "#0a0a0f",
          green: "#00ff9c",
          cyan: "#00d4ff",
          dim: "#1a1a24",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        thai: ["var(--font-thai)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 1.6: สร้าง `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": "." },
  },
});
```

- [ ] **Step 1.7: สร้าง `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body {
    background-color: theme('colors.matrix.bg');
    color: theme('colors.matrix.green');
    min-height: 100vh;
    font-family: theme('fontFamily.thai');
  }
}
```

- [ ] **Step 1.8: สร้าง `app/layout.tsx`**

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

- [ ] **Step 1.9: สร้าง `app/page.tsx` (placeholder)**

```tsx
export default function LandingPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-thai">Hybrid Matrix</h1>
      <p className="text-matrix-cyan mt-2">Scaffold OK — จะต่อ UI ใน Task 9</p>
    </main>
  );
}
```

- [ ] **Step 1.10: สร้าง `__tests__/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("test runner works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 1.11: สร้าง `README.md`**

```md
# Hybrid Matrix — Lotto Analyzer

Next.js app for statistical lotto analysis. See `docs/superpowers/specs/` for design.

## Dev

    pnpm install
    pnpm dev
    pnpm test
```

- [ ] **Step 1.12: ติดตั้ง dependencies**

Run: `pnpm install`
Expected: install สำเร็จ, `node_modules/` ถูกสร้าง

- [ ] **Step 1.13: รัน smoke test**

Run: `pnpm test`
Expected: 1 test passed

- [ ] **Step 1.14: ตรวจ dev server ขึ้นได้**

Run: `pnpm dev` → เปิด `http://localhost:3000` → เห็น "Hybrid Matrix" + "Scaffold OK"
กด Ctrl+C ปิด

- [ ] **Step 1.15: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest"
```

---

## Task 2: Domain Types + Engine Constants

**Files:**
- Create: `lib/types.ts`
- Create: `lib/engine/constants.ts`
- Create: `__tests__/engine/constants.test.ts`

**Interfaces:**
- Consumes: (nothing from earlier tasks)
- Produces:
  - `type DrawDate = string`
  - `type MatrixResult = { targetDate, firstPrize, adjacent, frontThree, backThree, backTwo, tensionScore }`
  - `type HistoricalDraw = { date: string; firstPrize: string }`
  - Constants exported จาก `lib/engine/constants.ts`: `PHI: Decimal`, `PI: Decimal`, `E: Decimal`, `DECIMAL_PRECISION = 50`

- [ ] **Step 2.1: เขียน failing test สำหรับ constants**

`__tests__/engine/constants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { PHI, PI, E, DECIMAL_PRECISION } from "@/lib/engine/constants";

describe("engine constants", () => {
  it("precision is set to 50", () => {
    expect(DECIMAL_PRECISION).toBe(50);
    expect(Decimal.precision).toBe(50);
  });

  it("PHI matches golden ratio to 50 digits", () => {
    expect(PHI.toString()).toBe(
      "1.6180339887498948482045868343656381177203091798058",
    );
  });

  it("PI matches to 50 digits", () => {
    expect(PI.toString()).toBe(
      "3.1415926535897932384626433832795028841971693993751",
    );
  });

  it("E matches to 50 digits", () => {
    expect(E.toString()).toBe(
      "2.7182818284590452353602874713526624977572470937",
    );
  });

  it("all constants are Decimal instances", () => {
    expect(PHI).toBeInstanceOf(Decimal);
    expect(PI).toBeInstanceOf(Decimal);
    expect(E).toBeInstanceOf(Decimal);
  });
});
```

- [ ] **Step 2.2: รัน test → คาดว่า FAIL (module not found)**

Run: `pnpm test __tests__/engine/constants.test.ts`
Expected: FAIL — "Cannot find module"

- [ ] **Step 2.3: สร้าง `lib/types.ts`**

```ts
export type DrawDate = string; // "DDMMYYYY" BE, e.g. "16082569"

export type MatrixResult = {
  targetDate: DrawDate;
  firstPrize: string;
  adjacent: [string, string];
  frontThree: [string, string];
  backThree: [string, string];
  backTwo: string;
  tensionScore: number;
};

export type HistoricalDraw = {
  date: string;
  firstPrize: string;
};
```

- [ ] **Step 2.4: สร้าง `lib/engine/constants.ts`**

```ts
import "server-only";
import Decimal from "decimal.js";

export const DECIMAL_PRECISION = 50;

Decimal.set({
  precision: DECIMAL_PRECISION,
  rounding: Decimal.ROUND_HALF_UP,
});

export const PHI = new Decimal(
  "1.6180339887498948482045868343656381177203091798058",
);

export const PI = new Decimal(
  "3.1415926535897932384626433832795028841971693993751",
);

export const E = new Decimal(
  "2.7182818284590452353602874713526624977572470937",
);
```

*Note:* `server-only` package ป้องกัน accidental client import (จะติดตั้งใน Task 8; ตอนนี้ import จะยัง fail ใน build client — ยังไม่มี client import จริง ให้ผ่านไปก่อน; จะเพิ่ม `server-only` dep ใน Task 8)

**แก้:** เอา `import "server-only";` ออกก่อน (Task 8 จะเติมกลับ):

```ts
import Decimal from "decimal.js";

export const DECIMAL_PRECISION = 50;

Decimal.set({
  precision: DECIMAL_PRECISION,
  rounding: Decimal.ROUND_HALF_UP,
});

export const PHI = new Decimal(
  "1.6180339887498948482045868343656381177203091798058",
);

export const PI = new Decimal(
  "3.1415926535897932384626433832795028841971693993751",
);

export const E = new Decimal(
  "2.7182818284590452353602874713526624977572470937",
);
```

- [ ] **Step 2.5: รัน test → คาดว่า PASS**

Run: `pnpm test __tests__/engine/constants.test.ts`
Expected: 5 tests passed

- [ ] **Step 2.6: Commit**

```bash
git add lib/types.ts lib/engine/constants.ts __tests__/engine/constants.test.ts
git commit -m "feat(engine): add domain types and decimal constants (precision 50)"
```

---

## Task 3: Historical Data Seed

**Files:**
- Create: `scripts/seed-historical.mjs`
- Create: `lib/data/historical.json`

**Interfaces:**
- Consumes: (nothing — dev-time script)
- Produces: `lib/data/historical.json` = `HistoricalDraw[]` ยาว 240 records

- [ ] **Step 3.1: สร้าง deterministic seed script**

`scripts/seed-historical.mjs`:

```js
// Deterministic mock generator for historical draws.
// Seeded with constant → reproducible across machines.
// Run once: `node scripts/seed-historical.mjs > lib/data/historical.json`

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// mulberry32 PRNG — deterministic given the seed
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260811);
const NUM_DRAWS = 240;

function randomDate(index) {
  // งวดออกทุกวันที่ 1 และ 16 ของเดือน
  // นับถอยหลังจาก 2568-08-16 (ประมาณ 10 ปี = 240 งวด)
  const totalHalfMonths = NUM_DRAWS - index; // 240..1
  const startYear = 2559;
  const halfMonth = totalHalfMonths % 2 === 0 ? 1 : 16;
  const monthOffset = Math.floor(totalHalfMonths / 2);
  const year = startYear + Math.floor(monthOffset / 12);
  const month = ((monthOffset % 12) + 1).toString().padStart(2, "0");
  const day = halfMonth.toString().padStart(2, "0");
  return `${day}${month}${year}`;
}

const draws = [];
for (let i = 0; i < NUM_DRAWS; i++) {
  const firstPrize = Math.floor(rand() * 1_000_000).toString().padStart(6, "0");
  draws.push({ date: randomDate(i), firstPrize });
}

const outPath = "lib/data/historical.json";
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(draws, null, 2) + "\n", "utf8");
console.error(`Wrote ${draws.length} draws to ${outPath}`);
```

- [ ] **Step 3.2: รัน script → generate JSON**

Run: `node scripts/seed-historical.mjs`
Expected: log "Wrote 240 draws to lib/data/historical.json"

- [ ] **Step 3.3: ตรวจไฟล์ JSON**

Run: `pnpm exec node -e "const d=require('./lib/data/historical.json'); console.log(d.length, d[0], d[d.length-1])"`
Expected: `240 { date: '...', firstPrize: '...' } { ... }`

- [ ] **Step 3.4: Commit**

```bash
git add scripts/seed-historical.mjs lib/data/historical.json
git commit -m "feat(data): add deterministic 240-draw historical seed"
```

---

## Task 4: Phase 1 — Statistical Tension

**Files:**
- Create: `lib/engine/statisticalTension.ts`
- Create: `__tests__/engine/statisticalTension.test.ts`

**Interfaces:**
- Consumes: `HistoricalDraw` from `lib/types.ts`, `Decimal` constants from `lib/engine/constants.ts`
- Produces: `computeStatisticalTension(draws: HistoricalDraw[]): Decimal` returning value ∈ [0, 1)

- [ ] **Step 4.1: เขียน failing test**

`__tests__/engine/statisticalTension.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeStatisticalTension } from "@/lib/engine/statisticalTension";
import type { HistoricalDraw } from "@/lib/types";

describe("computeStatisticalTension", () => {
  it("returns Decimal in [0, 1)", () => {
    const draws: HistoricalDraw[] = [
      { date: "01012567", firstPrize: "123456" },
      { date: "16012567", firstPrize: "789012" },
      { date: "01022567", firstPrize: "345678" },
    ];
    const s = computeStatisticalTension(draws);
    expect(s).toBeInstanceOf(Decimal);
    expect(s.gte(0)).toBe(true);
    expect(s.lt(1)).toBe(true);
  });

  it("deterministic — same input → same output", () => {
    const draws: HistoricalDraw[] = [
      { date: "01012567", firstPrize: "111222" },
      { date: "16012567", firstPrize: "333444" },
    ];
    const a = computeStatisticalTension(draws);
    const b = computeStatisticalTension(draws);
    expect(a.toString()).toBe(b.toString());
  });

  it("concatenates top-3 tension digits (fixed dataset)", () => {
    // เดา top-3 จากตัวอย่างเล็กๆ ที่คำนวณด้วยมือได้:
    // 5 draws, 30 digit slots
    const draws: HistoricalDraw[] = [
      { date: "d1", firstPrize: "000000" }, // 0×6
      { date: "d2", firstPrize: "000000" }, // 0×6
      { date: "d3", firstPrize: "111111" }, // 1×6
      { date: "d4", firstPrize: "222222" }, // 2×6
      { date: "d5", firstPrize: "333333" }, // 3×6
    ];
    // freq: 0→12, 1→6, 2→6, 3→6, 4-9→0
    // mean = 30/10 = 3
    // gap (จากงวดล่าสุด d5 ย้อนกลับ): 3=0, 2=1, 1=2, 0=3, 4-9=∞→ใช้ len (=5)
    // tension[d] = (freq-3)² × (gap+1)
    //   0: 81 × 4 = 324
    //   1: 9 × 3 = 27
    //   2: 9 × 2 = 18
    //   3: 9 × 1 = 9
    //   4-9: 9 × 6 = 54  (freq=0, gap=5)
    // top-3 by tension desc, digit asc as tie-break:
    //   0 (324), then digits 4..9 all tied at 54 → pick 4 first, 5 next
    //   → concat "045" → T = 45 → S_T = 0.045
    const s = computeStatisticalTension(draws);
    expect(s.toString()).toBe("0.045");
  });

  it("throws when draws array is empty", () => {
    expect(() => computeStatisticalTension([])).toThrow();
  });
});
```

- [ ] **Step 4.2: รัน test → FAIL (module not found)**

Run: `pnpm test __tests__/engine/statisticalTension.test.ts`
Expected: FAIL

- [ ] **Step 4.3: Implement `lib/engine/statisticalTension.ts`**

```ts
import Decimal from "decimal.js";
import type { HistoricalDraw } from "@/lib/types";
import "./constants"; // ensure Decimal.set() runs

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function computeStatisticalTension(draws: HistoricalDraw[]): Decimal {
  if (draws.length === 0) {
    throw new Error("computeStatisticalTension: draws must be non-empty");
  }

  // 1. count freq per digit
  const freq = new Map<number, number>(DIGITS.map((d) => [d, 0]));
  for (const draw of draws) {
    for (const ch of draw.firstPrize) {
      const d = Number(ch);
      freq.set(d, (freq.get(d) ?? 0) + 1);
    }
  }

  // 2. gap = draws-since-last-appearance (นับจากงวดล่าสุดคือ index สุดท้าย)
  const gap = new Map<number, number>();
  for (const d of DIGITS) {
    let g = draws.length; // default: never appeared
    for (let i = draws.length - 1; i >= 0; i--) {
      if (draws[i].firstPrize.includes(String(d))) {
        g = draws.length - 1 - i;
        break;
      }
    }
    gap.set(d, g);
  }

  // 3. tension[d] = (freq - mean)^2 × (gap + 1)
  const totalDigits = draws.length * 6;
  const mean = totalDigits / 10;
  const tension = DIGITS.map((d) => {
    const f = freq.get(d) ?? 0;
    const g = gap.get(d) ?? draws.length;
    return { digit: d, value: (f - mean) ** 2 * (g + 1) };
  });

  // 4. sort by tension desc, digit asc as tie-break
  tension.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return a.digit - b.digit;
  });

  // 5. concat top-3 digits → integer T → S_T = T / 1000
  const top3 = tension.slice(0, 3).map((t) => t.digit).join("");
  return new Decimal(top3).div(1000);
}
```

- [ ] **Step 4.4: รัน test → PASS**

Run: `pnpm test __tests__/engine/statisticalTension.test.ts`
Expected: 4 tests passed

- [ ] **Step 4.5: Commit**

```bash
git add lib/engine/statisticalTension.ts __tests__/engine/statisticalTension.test.ts
git commit -m "feat(engine): Phase 1 — Statistical Tension seed generation"
```

---

## Task 5: Phase 2 — Cosmic Multiplier

**Files:**
- Create: `lib/engine/cosmicMultiplier.ts`
- Create: `__tests__/engine/cosmicMultiplier.test.ts`

**Interfaces:**
- Consumes: `PHI, PI` from constants
- Produces: `cosmicMultiplier(targetDate: DrawDate, S_T: Decimal): Decimal` returning raw `X` (no mod/floor applied)

- [ ] **Step 5.1: เขียน failing test**

`__tests__/engine/cosmicMultiplier.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { cosmicMultiplier } from "@/lib/engine/cosmicMultiplier";
import { PHI, PI } from "@/lib/engine/constants";

describe("cosmicMultiplier", () => {
  it("returns Decimal", () => {
    const X = cosmicMultiplier("16082569", new Decimal("0.5"));
    expect(X).toBeInstanceOf(Decimal);
  });

  it("matches formula X = (D × S_T) × φ³ × π", () => {
    const D = new Decimal("16082569");
    const S_T = new Decimal("0.5");
    const expected = D.mul(S_T).mul(PHI.pow(3)).mul(PI);
    const got = cosmicMultiplier("16082569", S_T);
    expect(got.toString()).toBe(expected.toString());
  });

  it("deterministic — same input → same X", () => {
    const S_T = new Decimal("0.123");
    const a = cosmicMultiplier("01012570", S_T);
    const b = cosmicMultiplier("01012570", S_T);
    expect(a.toString()).toBe(b.toString());
  });

  it("throws on invalid date format", () => {
    expect(() => cosmicMultiplier("abc", new Decimal("0.5"))).toThrow();
    expect(() => cosmicMultiplier("", new Decimal("0.5"))).toThrow();
  });

  it("preserves precision (>40 significant digits)", () => {
    const X = cosmicMultiplier("16082569", new Decimal("0.5"));
    const s = X.toString().replace(".", "").replace(/^0+/, "");
    expect(s.length).toBeGreaterThanOrEqual(40);
  });
});
```

- [ ] **Step 5.2: รัน test → FAIL**

Run: `pnpm test __tests__/engine/cosmicMultiplier.test.ts`
Expected: FAIL

- [ ] **Step 5.3: Implement `lib/engine/cosmicMultiplier.ts`**

```ts
import Decimal from "decimal.js";
import { PHI, PI } from "./constants";
import type { DrawDate } from "@/lib/types";

export function cosmicMultiplier(targetDate: DrawDate, S_T: Decimal): Decimal {
  if (!/^\d+$/.test(targetDate)) {
    throw new Error(`cosmicMultiplier: invalid targetDate '${targetDate}'`);
  }
  const D = new Decimal(targetDate);
  return D.mul(S_T).mul(PHI.pow(3)).mul(PI);
}
```

- [ ] **Step 5.4: รัน test → PASS**

Run: `pnpm test __tests__/engine/cosmicMultiplier.test.ts`
Expected: 5 tests passed

- [ ] **Step 5.5: Commit**

```bash
git add lib/engine/cosmicMultiplier.ts __tests__/engine/cosmicMultiplier.test.ts
git commit -m "feat(engine): Phase 2 — Cosmic Multiplier formula"
```

---

## Task 6: Phase 3 — Matrix Extractor

**Files:**
- Create: `lib/engine/matrixExtractor.ts`
- Create: `__tests__/engine/matrixExtractor.test.ts`
- Create: `__tests__/engine/wrapAround.test.ts`

**Interfaces:**
- Consumes: `PI, E` from constants, `Decimal`, `MatrixResult`, `DrawDate`
- Produces: `extractMatrix(targetDate: DrawDate, X: Decimal, S_T: Decimal): MatrixResult`

- [ ] **Step 6.1: เขียน failing test — main extractor**

`__tests__/engine/matrixExtractor.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { extractMatrix } from "@/lib/engine/matrixExtractor";
import { PI, E } from "@/lib/engine/constants";

describe("extractMatrix", () => {
  const X = new Decimal("123456789.987654321098765432109876");
  const S_T = new Decimal("0.5");
  const result = extractMatrix("16082569", X, S_T);

  it("returns MatrixResult with target date echoed", () => {
    expect(result.targetDate).toBe("16082569");
  });

  it("firstPrize = floor(X × π) mod 10^6, zero-padded to 6 chars", () => {
    const expected = X.mul(PI).floor().mod(1_000_000).toString().padStart(6, "0");
    expect(result.firstPrize).toBe(expected);
    expect(result.firstPrize).toHaveLength(6);
  });

  it("adjacent = [prize-1 wrap, prize+1 wrap], zero-padded", () => {
    const prize = Number(result.firstPrize);
    const low = ((prize - 1 + 1_000_000) % 1_000_000).toString().padStart(6, "0");
    const high = ((prize + 1) % 1_000_000).toString().padStart(6, "0");
    expect(result.adjacent).toEqual([low, high]);
  });

  it("backTwo = floor(X) mod 100, 2-digit zero-padded", () => {
    const expected = X.floor().mod(100).toString().padStart(2, "0");
    expect(result.backTwo).toBe(expected);
    expect(result.backTwo).toHaveLength(2);
  });

  it("frontThree[0] = floor(X × 10^15) mod 1000, 3-digit padded", () => {
    const expected = X.mul(new Decimal(10).pow(15)).floor().mod(1000).toString().padStart(3, "0");
    expect(result.frontThree[0]).toBe(expected);
    expect(result.frontThree[0]).toHaveLength(3);
  });

  it("frontThree[1] = floor(X × e) mod 1000, 3-digit padded", () => {
    const expected = X.mul(E).floor().mod(1000).toString().padStart(3, "0");
    expect(result.frontThree[1]).toBe(expected);
  });

  it("backThree[0] = floor(sqrt(X)) mod 1000, 3-digit padded", () => {
    const expected = X.sqrt().floor().mod(1000).toString().padStart(3, "0");
    expect(result.backThree[0]).toBe(expected);
  });

  it("backThree[1] = floor(X^(1/3)) mod 1000, 3-digit padded", () => {
    const expected = X.pow(new Decimal(1).div(3)).floor().mod(1000).toString().padStart(3, "0");
    expect(result.backThree[1]).toBe(expected);
  });

  it("tensionScore = S_T × 100, 2 decimal places", () => {
    const r = extractMatrix("16082569", X, new Decimal("0.4215"));
    expect(r.tensionScore).toBe(42.15);
  });

  it("tensionScore in [0, 100]", () => {
    expect(result.tensionScore).toBeGreaterThanOrEqual(0);
    expect(result.tensionScore).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 6.2: เขียน failing test — wrap around edge cases**

`__tests__/engine/wrapAround.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { extractMatrix } from "@/lib/engine/matrixExtractor";
import { PI } from "@/lib/engine/constants";

describe("adjacent wrap-around", () => {
  // สร้าง X ที่ทำให้ Prize1 = 000000 หรือ 999999 เพื่อทดสอบขอบ
  // Prize1 = floor(X × π) mod 10^6
  //
  // ใช้ค่ากลาง (0.5) เพื่อกัน round-trip error จาก div/mul precision 50:
  //   X = 1_000_000.5 / π  →  X × π ≈ 1_000_000.5  →  floor = 1_000_000  →  mod 10^6 = 0
  //   X = 999_999.5 / π    →  X × π ≈ 999_999.5    →  floor = 999_999    →  mod 10^6 = 999_999
  const X_zero = new Decimal("1000000.5").div(PI);
  const X_max = new Decimal("999999.5").div(PI);

  it("Prize1 = 000000 → adjacent = [999999, 000001]", () => {
    const r = extractMatrix("00000000", X_zero, new Decimal("0"));
    expect(r.firstPrize).toBe("000000");
    expect(r.adjacent).toEqual(["999999", "000001"]);
  });

  it("Prize1 = 999999 → adjacent = [999998, 000000]", () => {
    const r = extractMatrix("00000000", X_max, new Decimal("0"));
    expect(r.firstPrize).toBe("999999");
    expect(r.adjacent).toEqual(["999998", "000000"]);
  });
});
```

- [ ] **Step 6.3: รัน tests → FAIL**

Run: `pnpm test __tests__/engine/matrixExtractor.test.ts __tests__/engine/wrapAround.test.ts`
Expected: FAIL

- [ ] **Step 6.4: Implement `lib/engine/matrixExtractor.ts`**

```ts
import Decimal from "decimal.js";
import { PI, E } from "./constants";
import type { DrawDate, MatrixResult } from "@/lib/types";

const TEN_TO_15 = new Decimal(10).pow(15);
const ONE_THIRD = new Decimal(1).div(3);

function pad(n: Decimal, len: number): string {
  return n.toString().padStart(len, "0");
}

export function extractMatrix(
  targetDate: DrawDate,
  X: Decimal,
  S_T: Decimal,
): MatrixResult {
  // 1. Prize1
  const prize = X.mul(PI).floor().mod(1_000_000);
  const firstPrize = pad(prize, 6);

  // 2. Adjacent (wrap mod 10^6)
  const p = prize.toNumber();
  const low = pad(new Decimal((p - 1 + 1_000_000) % 1_000_000), 6);
  const high = pad(new Decimal((p + 1) % 1_000_000), 6);

  // 3. Back-2
  const backTwo = pad(X.floor().mod(100), 2);

  // 4a. Front-3 set 1
  const front1 = pad(X.mul(TEN_TO_15).floor().mod(1000), 3);
  // 4b. Front-3 set 2
  const front2 = pad(X.mul(E).floor().mod(1000), 3);

  // 5a. Back-3 set 1
  const back1 = pad(X.sqrt().floor().mod(1000), 3);
  // 5b. Back-3 set 2
  const back2 = pad(X.pow(ONE_THIRD).floor().mod(1000), 3);

  // Tension score for display
  const tensionScore = S_T.mul(100).toDecimalPlaces(2).toNumber();

  return {
    targetDate,
    firstPrize,
    adjacent: [low, high],
    frontThree: [front1, front2],
    backThree: [back1, back2],
    backTwo,
    tensionScore,
  };
}
```

- [ ] **Step 6.5: รัน tests → PASS**

Run: `pnpm test __tests__/engine/matrixExtractor.test.ts __tests__/engine/wrapAround.test.ts`
Expected: all passed

- [ ] **Step 6.6: Commit**

```bash
git add lib/engine/matrixExtractor.ts __tests__/engine/matrixExtractor.test.ts __tests__/engine/wrapAround.test.ts
git commit -m "feat(engine): Phase 3 — Matrix extractor + wrap-around handling"
```

---

## Task 7: Orchestrator + Golden Snapshot

**Files:**
- Create: `lib/engine/index.ts`
- Create: `__tests__/engine/determinism.test.ts`

**Interfaces:**
- Consumes: `computeStatisticalTension`, `cosmicMultiplier`, `extractMatrix`
- Produces: `calculateHybridMatrix(targetDate: DrawDate): MatrixResult`

- [ ] **Step 7.1: Implement orchestrator `lib/engine/index.ts`**

```ts
import type { DrawDate, MatrixResult } from "@/lib/types";
import HISTORICAL from "@/lib/data/historical.json";
import { computeStatisticalTension } from "./statisticalTension";
import { cosmicMultiplier } from "./cosmicMultiplier";
import { extractMatrix } from "./matrixExtractor";

export function calculateHybridMatrix(targetDate: DrawDate): MatrixResult {
  const S_T = computeStatisticalTension(HISTORICAL);
  const X = cosmicMultiplier(targetDate, S_T);
  return extractMatrix(targetDate, X, S_T);
}
```

- [ ] **Step 7.2: เขียน determinism-generator test (first run captures snapshot)**

`__tests__/engine/determinism.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateHybridMatrix } from "@/lib/engine";
import type { DrawDate, MatrixResult } from "@/lib/types";

// ⭐ Golden Snapshot — ค่า expected จะถูกล็อกหลัง run แรก
// ถ้ามีคนแก้ engine แล้วผลเปลี่ยน → test fail
const CASES: DrawDate[] = [
  "01012567",
  "16032568",
  "01072568",
  "16082569",
  "01012570",
];

describe("determinism (golden snapshot)", () => {
  it.each(CASES)("matrix for %s is stable", (date) => {
    const first = calculateHybridMatrix(date);
    const second = calculateHybridMatrix(date);
    expect(second).toEqual(first);
  });

  it("full snapshot for 16082569 stays stable", () => {
    const r = calculateHybridMatrix("16082569");
    expect(r).toMatchSnapshot();
  });

  it("shapes are valid", () => {
    for (const d of CASES) {
      const r = calculateHybridMatrix(d);
      expect(r.firstPrize).toMatch(/^\d{6}$/);
      expect(r.adjacent[0]).toMatch(/^\d{6}$/);
      expect(r.adjacent[1]).toMatch(/^\d{6}$/);
      expect(r.frontThree[0]).toMatch(/^\d{3}$/);
      expect(r.frontThree[1]).toMatch(/^\d{3}$/);
      expect(r.backThree[0]).toMatch(/^\d{3}$/);
      expect(r.backThree[1]).toMatch(/^\d{3}$/);
      expect(r.backTwo).toMatch(/^\d{2}$/);
      expect(r.tensionScore).toBeGreaterThanOrEqual(0);
      expect(r.tensionScore).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 7.3: รัน test — snapshot ถูกสร้างครั้งแรก**

Run: `pnpm test __tests__/engine/determinism.test.ts`
Expected: PASS (creates `__snapshots__/determinism.test.ts.snap`)

- [ ] **Step 7.4: รันซ้ำ — snapshot ต้อง match**

Run: `pnpm test __tests__/engine/determinism.test.ts`
Expected: PASS (no snapshot updates)

- [ ] **Step 7.5: รัน full test suite**

Run: `pnpm test`
Expected: ทุก test passed

- [ ] **Step 7.6: Commit**

```bash
git add lib/engine/index.ts __tests__/engine/determinism.test.ts __tests__/engine/__snapshots__/
git commit -m "feat(engine): orchestrator + golden snapshot determinism test"
```

---

## Task 8: Server-Only Guard + Session Helper

**Files:**
- Modify: `package.json` (add `server-only`)
- Modify: `lib/engine/constants.ts` (add `import "server-only"`)
- Modify: `lib/engine/index.ts` (add `import "server-only"`)
- Create: `.eslintrc.json`
- Create: `lib/session/unlock.ts`

**Interfaces:**
- Consumes: `cookies()` from `next/headers`
- Produces:
  - `isUnlocked(): boolean` — sync check
  - `setUnlocked(): void` — sets `lotto_unlock=1` httpOnly cookie
  - ESLint rule: files under `components/**` และ `app/**/*.tsx` cannot import `@/lib/engine/*`

- [ ] **Step 8.1: ติดตั้ง `server-only`**

Run: `pnpm add server-only`

- [ ] **Step 8.2: เติม `server-only` ให้ engine barrel**

Modify `lib/engine/index.ts`, add at top:

```ts
import "server-only";
```

Modify `lib/engine/constants.ts`, add at top:

```ts
import "server-only";
```

- [ ] **Step 8.3: สร้าง `lib/session/unlock.ts`**

```ts
import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "lotto_unlock";
const COOKIE_VALUE = "1";

export function isUnlocked(): boolean {
  return cookies().get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export function setUnlocked(): void {
  cookies().set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // ไม่ระบุ maxAge → session cookie
  });
}
```

- [ ] **Step 8.4: สร้าง `.eslintrc.json` กัน client import engine**

```json
{
  "extends": "next/core-web-vitals",
  "overrides": [
    {
      "files": ["components/**/*.{ts,tsx}", "app/**/*.tsx"],
      "excludedFiles": ["app/**/route.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": ["@/lib/engine", "@/lib/engine/*"],
                "message": "Engine ต้องเรียกผ่าน @/lib/actions/* เท่านั้น"
              },
              {
                "group": ["@/lib/session/*"],
                "message": "Session helpers ต้องเรียกจาก server action หรือ server component เท่านั้น"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

- [ ] **Step 8.5: รัน lint + tests**

Run: `pnpm lint && pnpm test`
Expected: lint clean; ทุก test ยังผ่าน

- [ ] **Step 8.6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/engine/constants.ts lib/engine/index.ts lib/session/unlock.ts .eslintrc.json
git commit -m "chore: enforce server-only for engine + add unlock session helpers"
```

---

## Task 9: Server Actions (generateMatrix + confirmUnlock)

**Files:**
- Create: `lib/actions/generateMatrix.ts`
- Create: `lib/actions/confirmUnlock.ts`
- Create: `__tests__/actions/generateMatrix.test.ts`

**Interfaces:**
- Consumes: `calculateHybridMatrix`, `isUnlocked`, `setUnlocked`
- Produces:
  - `generateMatrix(targetDate: DrawDate): Promise<MatrixResult>` — throws `"UNLOCK_REQUIRED"` หรือ `"INVALID_DATE"`
  - `confirmUnlock(): Promise<void>` — sets cookie

- [ ] **Step 9.1: เขียน failing test (mock next/headers)**

`__tests__/actions/generateMatrix.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieValue = { current: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "lotto_unlock" && mockCookieValue.current
        ? { value: mockCookieValue.current }
        : undefined,
    set: () => {},
  }),
}));

// Import AFTER mock
import { generateMatrix } from "@/lib/actions/generateMatrix";

describe("generateMatrix action", () => {
  beforeEach(() => {
    mockCookieValue.current = undefined;
  });

  it("throws UNLOCK_REQUIRED when cookie missing", async () => {
    await expect(generateMatrix("16082569")).rejects.toThrow("UNLOCK_REQUIRED");
  });

  it("throws INVALID_DATE for bad format", async () => {
    mockCookieValue.current = "1";
    await expect(generateMatrix("bad")).rejects.toThrow("INVALID_DATE");
    await expect(generateMatrix("1234567")).rejects.toThrow("INVALID_DATE");
    await expect(generateMatrix("123456789")).rejects.toThrow("INVALID_DATE");
  });

  it("returns MatrixResult when unlocked and valid", async () => {
    mockCookieValue.current = "1";
    const r = await generateMatrix("16082569");
    expect(r.targetDate).toBe("16082569");
    expect(r.firstPrize).toMatch(/^\d{6}$/);
  });
});
```

- [ ] **Step 9.2: รัน test → FAIL**

Run: `pnpm test __tests__/actions/generateMatrix.test.ts`
Expected: FAIL

- [ ] **Step 9.3: Implement `lib/actions/generateMatrix.ts`**

```ts
"use server";

import { calculateHybridMatrix } from "@/lib/engine";
import { isUnlocked } from "@/lib/session/unlock";
import type { DrawDate, MatrixResult } from "@/lib/types";

export async function generateMatrix(
  targetDate: DrawDate,
): Promise<MatrixResult> {
  if (!isUnlocked()) {
    throw new Error("UNLOCK_REQUIRED");
  }
  if (!/^\d{8}$/.test(targetDate)) {
    throw new Error("INVALID_DATE");
  }
  return calculateHybridMatrix(targetDate);
}
```

- [ ] **Step 9.4: Implement `lib/actions/confirmUnlock.ts`**

```ts
"use server";

import { setUnlocked } from "@/lib/session/unlock";

export async function confirmUnlock(): Promise<void> {
  setUnlocked();
}
```

- [ ] **Step 9.5: รัน test → PASS**

Run: `pnpm test __tests__/actions/generateMatrix.test.ts`
Expected: 3 tests passed

- [ ] **Step 9.6: Commit**

```bash
git add lib/actions/ __tests__/actions/
git commit -m "feat(actions): generateMatrix + confirmUnlock server actions"
```

---

## Task 10: Landing Page — Hero + Legal Checkpoint

**Files:**
- Modify: `app/page.tsx`
- Create: `components/gateway/LegalCheckpoint.tsx`

**Interfaces:**
- Consumes: (styling primitives)
- Produces:
  - `<LegalCheckpoint onAccept={fn} />` client component ที่ manage checkbox
  - `app/page.tsx` render hero + `<LegalCheckpoint>` + placeholder สำหรับ payment (Task 11)

- [ ] **Step 10.1: สร้าง `components/gateway/LegalCheckpoint.tsx`**

```tsx
"use client";

import { useState } from "react";

type Props = { onAccept: () => void };

export function LegalCheckpoint({ onAccept }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <section className="max-w-2xl mx-auto rounded-2xl border border-matrix-cyan/30 bg-matrix-dim/60 p-6 shadow-[0_0_40px_-10px_#00d4ff]">
      <h2 className="text-xl font-thai text-matrix-cyan mb-4">
        ข้อตกลงก่อนเข้าใช้งาน
      </h2>
      <p className="text-sm leading-relaxed text-matrix-green/90 mb-4">
        ระบบนี้เกิดจากการคำนวณทางสถิติและคณิตศาสตร์เพื่อความบันเทิงเท่านั้น
        <span className="text-matrix-cyan font-semibold">
          {" "}ไม่มีการรับประกันผลการออกรางวัลใดๆ{" "}
        </span>
        การใช้งานถือว่าคุณเข้าใจว่าเลขที่แสดงเป็นผลจากอัลกอริทึม
        ไม่ใช่การทำนายผลจริง
      </p>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-5 w-5 accent-matrix-green cursor-pointer"
        />
        <span className="font-thai text-sm">
          ฉันได้อ่านและยอมรับเงื่อนไขข้างต้น
        </span>
      </label>
      <button
        onClick={onAccept}
        disabled={!checked}
        className="mt-6 w-full py-3 rounded-lg font-mono font-semibold uppercase tracking-widest bg-matrix-green text-matrix-bg disabled:bg-matrix-dim disabled:text-matrix-green/40 disabled:cursor-not-allowed transition"
      >
        ถัดไป
      </button>
    </section>
  );
}
```

- [ ] **Step 10.2: เขียน `app/page.tsx` — flow stepper**

```tsx
"use client";

import { useState } from "react";
import { LegalCheckpoint } from "@/components/gateway/LegalCheckpoint";

type Step = "hero" | "legal" | "payment";

export default function LandingPage() {
  const [step, setStep] = useState<Step>("hero");

  return (
    <main className="min-h-screen p-6 md:p-12">
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="font-mono text-5xl md:text-6xl font-bold text-matrix-green drop-shadow-[0_0_15px_#00ff9c]">
          HYBRID MATRIX
        </h1>
        <p className="mt-3 font-thai text-matrix-cyan">
          ระบบวิเคราะห์ตัวเลขด้วย Deterministic Cosmic Algorithm
        </p>
      </header>

      {step === "hero" && (
        <section className="max-w-2xl mx-auto text-center">
          <p className="font-thai text-matrix-green/80 mb-8">
            ผสานพลังของ Golden Ratio, Pi, และสถิติย้อนหลัง 10 ปี
            เพื่อสกัดชุดตัวเลขที่มีแรงเค้นทางสถิติสูงสุด
          </p>
          <button
            onClick={() => setStep("legal")}
            className="px-8 py-3 rounded-lg font-mono uppercase tracking-widest bg-matrix-green text-matrix-bg hover:shadow-[0_0_25px_#00ff9c] transition"
          >
            เข้าสู่ระบบวิเคราะห์
          </button>
        </section>
      )}

      {step === "legal" && <LegalCheckpoint onAccept={() => setStep("payment")} />}

      {step === "payment" && (
        <section className="max-w-2xl mx-auto text-center text-matrix-cyan">
          {/* Payment mockup — จะทำใน Task 11 */}
          <p>[Payment mockup — coming in Task 11]</p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 10.3: Manual verification**

Run: `pnpm dev`
เปิด `http://localhost:3000` →
1. เห็น hero "HYBRID MATRIX" (matrix green + glow)
2. กด "เข้าสู่ระบบวิเคราะห์" → เห็น Legal Checkpoint
3. ปุ่ม "ถัดไป" ต้อง disabled ตอนแรก
4. ติ๊ก checkbox → ปุ่ม active
5. กดถัดไป → เห็น placeholder "coming in Task 11"

Ctrl+C ปิด

- [ ] **Step 10.4: Commit**

```bash
git add app/page.tsx components/gateway/LegalCheckpoint.tsx
git commit -m "feat(ui): landing hero + legal checkpoint clickwrap"
```

---

## Task 11: Payment Mockup + Unlock Flow

**Files:**
- Modify: `app/page.tsx`
- Create: `components/gateway/PaymentMockup.tsx`

**Interfaces:**
- Consumes: `confirmUnlock` server action from `@/lib/actions/confirmUnlock`
- Produces:
  - `<PaymentMockup />` client component that shows QR + slip upload UI, calls `confirmUnlock` on button click, then `router.push('/dashboard')`

- [ ] **Step 11.1: สร้าง `components/gateway/PaymentMockup.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmUnlock } from "@/lib/actions/confirmUnlock";

export function PaymentMockup() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUnlock = () => {
    startTransition(async () => {
      await confirmUnlock();
      router.push("/dashboard");
    });
  };

  return (
    <section className="max-w-2xl mx-auto rounded-2xl border border-matrix-green/40 bg-matrix-dim/60 p-6">
      <h2 className="text-xl font-thai text-matrix-green mb-2">
        สนับสนุนค่าเซิร์ฟเวอร์เพื่อปลดล็อกระบบ
      </h2>
      <p className="text-sm font-thai text-matrix-cyan/80 mb-6">
        สแกน QR เพื่อโอน แล้วอัปโหลดสลิปเพื่อยืนยันการปลดล็อก
      </p>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Mock QR = ASCII square pattern (data URI SVG) */}
        <div className="flex-shrink-0 w-48 h-48 rounded-lg bg-white p-3 grid place-items-center">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {Array.from({ length: 100 }, (_, i) => {
              const x = i % 10;
              const y = Math.floor(i / 10);
              const fill = (x * 7 + y * 3) % 3 === 0 ? "#000" : "#fff";
              return <rect key={i} x={x * 10} y={y * 10} width="10" height="10" fill={fill} />;
            })}
          </svg>
        </div>

        <div className="flex-1 w-full">
          <label className="block w-full rounded-lg border-2 border-dashed border-matrix-cyan/40 p-6 text-center cursor-pointer hover:border-matrix-cyan transition">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <span className="font-thai text-matrix-cyan">
              {fileName ? `📎 ${fileName}` : "แตะเพื่ออัปโหลดสลิป (mockup)"}
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleUnlock}
        disabled={pending}
        className="mt-8 w-full py-3 rounded-lg font-mono font-semibold uppercase tracking-widest bg-matrix-green text-matrix-bg disabled:opacity-50 disabled:cursor-wait transition"
      >
        {pending ? "กำลังปลดล็อก..." : "ยืนยันการสนับสนุน"}
      </button>
    </section>
  );
}
```

- [ ] **Step 11.2: ต่อ `<PaymentMockup />` เข้ากับ `app/page.tsx`**

Replace placeholder in `app/page.tsx`:

```tsx
{step === "payment" && <PaymentMockup />}
```

และเพิ่ม import ด้านบน:

```tsx
import { PaymentMockup } from "@/components/gateway/PaymentMockup";
```

- [ ] **Step 11.3: Manual verification**

Run: `pnpm dev`
1. Landing → Legal → กดถัดไป
2. เห็น QR + upload area
3. เลือกไฟล์ใดก็ได้ → เห็นชื่อ file
4. กด "ยืนยันการสนับสนุน" → redirect ไป `/dashboard` (404 เพราะ Task 12 ยังไม่ทำ — ตอนนี้แค่ verify redirect)

Ctrl+C ปิด

- [ ] **Step 11.4: Commit**

```bash
git add app/page.tsx components/gateway/PaymentMockup.tsx
git commit -m "feat(ui): payment mockup + unlock cookie flow"
```

---

## Task 12: Dashboard Shell + Date Selector

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/dashboard/DateSelector.tsx`
- Create: `components/dashboard/GenerateButton.tsx`

**Interfaces:**
- Consumes:
  - `isUnlocked` (guard)
  - `generateMatrix` action (from GenerateButton)
- Produces:
  - `<DateSelector value={string} onChange={(v)=>void} />` — Thai date input → 8-digit BE string
  - `<GenerateButton date={string} onResult={(r)=>void} onError={(e)=>void} />` — invokes server action

- [ ] **Step 12.1: Implement `components/dashboard/DateSelector.tsx`**

```tsx
"use client";

type Props = {
  value: string; // "DDMMYYYY" BE
  onChange: (v: string) => void;
};

// convert BE "DDMMYYYY" → ISO "YYYY-MM-DD" AD (for <input type="date">)
function beToIso(be: string): string {
  if (!/^\d{8}$/.test(be)) return "";
  const dd = be.slice(0, 2);
  const mm = be.slice(2, 4);
  const yyyyBe = Number(be.slice(4, 8));
  const yyyyAd = yyyyBe - 543;
  return `${yyyyAd.toString().padStart(4, "0")}-${mm}-${dd}`;
}

function isoToBe(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  const yBe = Number(y) + 543;
  return `${d}${m}${yBe.toString().padStart(4, "0")}`;
}

export function DateSelector({ value, onChange }: Props) {
  return (
    <label className="block">
      <span className="font-thai text-sm text-matrix-cyan mb-2 block">
        เลือกวันงวด (พ.ศ.)
      </span>
      <input
        type="date"
        value={beToIso(value)}
        onChange={(e) => onChange(isoToBe(e.target.value))}
        className="w-full rounded-lg bg-matrix-dim border border-matrix-cyan/40 px-4 py-3 font-mono text-matrix-green focus:border-matrix-cyan focus:outline-none"
      />
      <span className="font-mono text-xs text-matrix-green/60 mt-1 block">
        รูปแบบ: {value || "DDMMYYYY"}
      </span>
    </label>
  );
}
```

- [ ] **Step 12.2: Implement `components/dashboard/GenerateButton.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { generateMatrix } from "@/lib/actions/generateMatrix";
import type { MatrixResult } from "@/lib/types";

type Props = {
  date: string;
  onResult: (r: MatrixResult) => void;
  onError: (msg: string) => void;
};

export function GenerateButton({ date, onResult, onError }: Props) {
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      try {
        const r = await generateMatrix(date);
        onResult(r);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "UNKNOWN";
        onError(
          msg === "UNLOCK_REQUIRED"
            ? "ยังไม่ปลดล็อกระบบ"
            : msg === "INVALID_DATE"
              ? "รูปแบบวันที่ไม่ถูกต้อง"
              : "เกิดข้อผิดพลาด",
        );
      }
    });
  };

  return (
    <button
      onClick={run}
      disabled={pending || !date}
      className="w-full py-3 rounded-lg font-mono font-semibold uppercase tracking-widest bg-matrix-green text-matrix-bg disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {pending ? "กำลังคำนวณ..." : "รันการวิเคราะห์"}
    </button>
  );
}
```

- [ ] **Step 12.3: Implement `app/dashboard/page.tsx` (guarded)**

```tsx
import { redirect } from "next/navigation";
import { isUnlocked } from "@/lib/session/unlock";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  if (!isUnlocked()) redirect("/");
  return <DashboardClient />;
}
```

- [ ] **Step 12.4: สร้าง `components/dashboard/DashboardClient.tsx` (shell — cards เพิ่มใน Task 13)**

```tsx
"use client";

import { useState } from "react";
import { DateSelector } from "./DateSelector";
import { GenerateButton } from "./GenerateButton";
import type { MatrixResult } from "@/lib/types";

function defaultDate(): string {
  // งวดถัดไป: 1 หรือ 16 ของเดือน (แบบง่าย — ใช้วันนี้ + BE offset)
  const now = new Date();
  const day = now.getDate() >= 16 ? "01" : "16";
  const monthIdx = now.getDate() >= 16 ? now.getMonth() + 1 : now.getMonth();
  const month = ((monthIdx % 12) + 1).toString().padStart(2, "0");
  const year = (now.getFullYear() + 543 + (now.getDate() >= 16 && now.getMonth() === 11 ? 1 : 0));
  return `${day}${month}${year}`;
}

export function DashboardClient() {
  const [date, setDate] = useState(defaultDate);
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="min-h-screen p-6 md:p-12">
      <h1 className="font-mono text-3xl text-matrix-green drop-shadow-[0_0_10px_#00ff9c] text-center mb-8">
        ANALYSIS DASHBOARD
      </h1>

      <div className="max-w-xl mx-auto space-y-4 mb-12">
        <DateSelector value={date} onChange={setDate} />
        <GenerateButton
          date={date}
          onResult={(r) => {
            setResult(r);
            setError(null);
          }}
          onError={(e) => {
            setError(e);
            setResult(null);
          }}
        />
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-red-300 font-thai text-sm">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="max-w-4xl mx-auto">
          {/* Cards จะเพิ่มใน Task 13 */}
          <pre className="bg-matrix-dim p-4 rounded font-mono text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 12.5: Manual verification**

Run: `pnpm dev`
1. ไป `http://localhost:3000/dashboard` ตรงๆ → ต้อง redirect กลับ `/`
2. ทำ flow ปลด lock → redirect ไป `/dashboard`
3. เห็น Date picker + ปุ่ม "รันการวิเคราะห์"
4. กดปุ่ม → เห็น JSON result

Ctrl+C ปิด

- [ ] **Step 12.6: Commit**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat(ui): dashboard shell with guard, date selector, generate action"
```

---

## Task 13: Result Cards + Copy Button + Tension Meter

**Files:**
- Create: `components/dashboard/ResultCard.tsx`
- Create: `components/dashboard/CopyButton.tsx`
- Create: `components/dashboard/TensionMeter.tsx`
- Modify: `components/dashboard/DashboardClient.tsx` (render cards instead of `<pre>`)

**Interfaces:**
- Consumes: `MatrixResult`
- Produces:
  - `<ResultCard title numbers[] tension />` — server-safe card
  - `<CopyButton text />` — client, uses `navigator.clipboard`
  - `<TensionMeter score /> — server-safe progress bar (0-100)

- [ ] **Step 13.1: Implement `components/dashboard/TensionMeter.tsx`**

```tsx
type Props = { score: number };

export function TensionMeter({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] font-mono text-matrix-cyan/70 mb-1">
        <span>TENSION</span>
        <span>{clamped.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 rounded bg-matrix-dim overflow-hidden">
        <div
          className="h-full bg-matrix-cyan shadow-[0_0_8px_#00d4ff]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 13.2: Implement `components/dashboard/CopyButton.tsx`**

```tsx
"use client";

import { useState } from "react";

type Props = { text: string };

export function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silently ignore
    }
  };

  return (
    <button
      onClick={copy}
      className="ml-2 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider border border-matrix-cyan/40 text-matrix-cyan hover:bg-matrix-cyan/10 transition"
      aria-label={`Copy ${text}`}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}
```

- [ ] **Step 13.3: Implement `components/dashboard/ResultCard.tsx`**

```tsx
import { CopyButton } from "./CopyButton";
import { TensionMeter } from "./TensionMeter";

type Props = {
  title: string;
  numbers: string[];
  tension: number;
};

export function ResultCard({ title, numbers, tension }: Props) {
  return (
    <article className="rounded-xl border border-matrix-green/30 bg-matrix-dim/70 p-5 shadow-[0_0_20px_-8px_#00ff9c]">
      <h3 className="font-thai text-sm text-matrix-cyan uppercase tracking-widest mb-3">
        {title}
      </h3>
      <ul className="space-y-2">
        {numbers.map((n, i) => (
          <li key={`${n}-${i}`} className="flex items-center justify-between">
            <span className="font-mono text-3xl text-matrix-green drop-shadow-[0_0_8px_#00ff9c]">
              {n}
            </span>
            <CopyButton text={n} />
          </li>
        ))}
      </ul>
      <TensionMeter score={tension} />
    </article>
  );
}
```

- [ ] **Step 13.4: Modify `components/dashboard/DashboardClient.tsx` — swap `<pre>` for cards**

Replace:

```tsx
{result && (
  <div className="max-w-4xl mx-auto">
    <pre className="bg-matrix-dim p-4 rounded font-mono text-xs overflow-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  </div>
)}
```

With:

```tsx
{result && (
  <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <ResultCard
      title="รางวัลที่ 1"
      numbers={[result.firstPrize]}
      tension={result.tensionScore}
    />
    <ResultCard
      title="ข้างเคียงรางวัลที่ 1"
      numbers={result.adjacent}
      tension={result.tensionScore}
    />
    <ResultCard
      title="เลขหน้า 3 ตัว"
      numbers={result.frontThree}
      tension={result.tensionScore}
    />
    <ResultCard
      title="เลขท้าย 3 ตัว"
      numbers={result.backThree}
      tension={result.tensionScore}
    />
    <ResultCard
      title="เลขท้าย 2 ตัว"
      numbers={[result.backTwo]}
      tension={result.tensionScore}
    />
  </div>
)}
```

Add import at top:

```tsx
import { ResultCard } from "./ResultCard";
```

- [ ] **Step 13.5: Manual verification**

Run: `pnpm dev`
1. Complete flow → dashboard → รันการวิเคราะห์
2. เห็นการ์ด 5 การ์ด (รางวัลที่ 1, ข้างเคียง, เลขหน้า 3, เลขท้าย 3, เลขท้าย 2)
3. แต่ละการ์ดมีปุ่ม COPY ข้างเลข → กดแล้วเปลี่ยนเป็น COPIED
4. paste ตรงไหนก็ได้ → ได้เลข 6/3/2 หลักถูกต้อง
5. TENSION bar ด้านล่างการ์ด แสดงเปอร์เซ็นต์ + สีฟ้าเรืองแสง

Ctrl+C ปิด

- [ ] **Step 13.6: Commit**

```bash
git add components/dashboard/
git commit -m "feat(ui): result cards with copy-to-clipboard + tension meter"
```

---

## Task 14: Grid Background + Deploy Config + README

**Files:**
- Modify: `app/globals.css` (grid overlay)
- Modify: `next.config.js` (nothing needed — Next.js 14 stable server actions)
- Modify: `README.md` (deploy instructions)

**Interfaces:**
- Consumes: (styling only)
- Produces: Matrix grid background across all pages + finalized README

- [ ] **Step 14.1: เติม grid overlay ใน `app/globals.css`**

Append:

```css
@layer utilities {
  body {
    background-image:
      linear-gradient(rgba(0, 255, 156, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 156, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    background-position: -1px -1px;
  }
}
```

- [ ] **Step 14.2: Update `README.md`**

```md
# Hybrid Matrix — Lotto Analyzer

Next.js web app ที่คำนวณชุดตัวเลขสลากด้วย Deterministic Hybrid Matrix
(สถิติย้อนหลัง + Golden Ratio + Pi + Euler's e).

**เพื่อความบันเทิงและการเรียนรู้ Data Science เท่านั้น — ไม่รับประกันผลรางวัล**

## Requirements

- Node.js 20+
- pnpm 8+ (หรือ npm/yarn)

## Local Dev

    pnpm install
    pnpm dev            # http://localhost:3000
    pnpm test           # run engine tests
    pnpm test:watch     # TDD mode
    pnpm lint

## Deploy (Vercel)

1. Push repo ขึ้น GitHub
2. Import project ใน Vercel Dashboard
3. Framework preset: **Next.js** (auto-detected)
4. No environment variables required
5. Deploy

## Architecture

See `docs/superpowers/specs/2026-08-11-hybrid-matrix-lotto-design.md`
```

- [ ] **Step 14.3: รัน full test + lint + build**

Run:
```
pnpm test
pnpm lint
pnpm build
```
Expected: all green

- [ ] **Step 14.4: Manual verification (final)**

Run: `pnpm dev` → complete e2e flow ในเบราว์เซอร์
1. Landing → Legal → Payment → Dashboard → คำนวณ 2 วันที่ต่างกัน
2. ยืนยันเลขเปลี่ยนตามวันที่
3. Copy ทุกการ์ดใช้งานได้
4. Refresh หน้า `/dashboard` → ยังอยู่ (cookie persistent ใน session)
5. Grid background เห็นชัดในทุกหน้า

Ctrl+C ปิด

- [ ] **Step 14.5: Commit**

```bash
git add app/globals.css README.md
git commit -m "chore: matrix grid background + deploy docs"
```

---

## Verification Summary

หลังจบทุก task ต้องได้:

1. ✅ `pnpm test` — passes all engine + action tests (รวม golden snapshot)
2. ✅ `pnpm lint` — no errors
3. ✅ `pnpm build` — production build สำเร็จ
4. ✅ Manual e2e flow: Landing → Legal → Payment → Dashboard → generate + copy
5. ✅ Determinism: input `16082569` (unlocked) → ผลลัพธ์เดียวกันทุกครั้ง
6. ✅ ESLint: ลอง import `@/lib/engine` ใน client component → lint error
