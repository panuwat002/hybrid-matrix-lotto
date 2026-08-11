# Hybrid Matrix — Lotto Analyzer

Next.js web app ที่คำนวณชุดตัวเลขสลากด้วย Deterministic Hybrid Matrix
(สถิติย้อนหลัง + Golden Ratio + Pi + Euler's e)

**เพื่อความบันเทิงและการเรียนรู้ Data Science เท่านั้น — ไม่รับประกันผลรางวัล**

## Requirements

- Node.js 20+ (verified on v24)
- pnpm 8+
- On exFAT drives (e.g. Windows external drives): the repo ships a
  `pnpm-workspace.yaml` with `nodeLinker: hoisted` because pnpm's default
  symlink layout is not supported. `pnpm dev` uses Turbopack (`--turbo`)
  by default because Next.js's webpack pipeline hangs on exFAT
  (`EISDIR` on `readlink` of internal files). Turbopack (Rust-based
  file I/O) is unaffected. Fallback: `pnpm dev:webpack` if needed on
  NTFS/ext4.
- Local `pnpm build` may still fail on exFAT with the same `EISDIR` —
  production builds succeed on Vercel (Linux ext4).

## Local Dev

    pnpm install
    pnpm dev            # http://localhost:3000
    pnpm test           # run engine + action tests
    pnpm test:watch     # TDD mode
    pnpm lint

## Flow

1. Landing → กด "เข้าสู่ระบบวิเคราะห์"
2. Legal Checkpoint → ติ๊กยอมรับ → กดถัดไป
3. Payment Mockup → กด "ยืนยันการสนับสนุน" (mock — ตั้ง cookie)
4. Dashboard → เลือกวันงวด → กด "รันการวิเคราะห์"

## Architecture

- `lib/engine/**` — server-only Hybrid Matrix (Decimal precision 50)
- `lib/actions/**` — Next.js Server Actions (single bridge to client)
- `lib/session/**` — httpOnly cookie helpers
- `lib/data/historical.json` — 240-draw seed (deterministic mulberry32)
- `app/**` + `components/**` — React (App Router)
- `__tests__/**` — Vitest suite (37 tests, golden snapshot for regressions)

See `docs/superpowers/specs/2026-08-11-hybrid-matrix-lotto-design.md`
for the full design (Phase 1–3 formulas, isolation rules, Q1–Q3 decisions).

## Deploy (Vercel)

1. Push repo ขึ้น GitHub
2. Import project ใน Vercel Dashboard
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `pnpm build` (Vercel auto-uses pnpm if lockfile present)
5. No environment variables required
6. Deploy

## Determinism

Input `targetDate` เดียวกัน → output ตัวเลขเดียวกันเสมอ ตรวจสอบได้ด้วย
`__tests__/engine/determinism.test.ts` (golden snapshot 5 dates)
