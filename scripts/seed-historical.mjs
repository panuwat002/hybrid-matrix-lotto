// Deterministic mock generator for historical draws.
// Seeded with constant → reproducible across machines.
// Run once: `node scripts/seed-historical.mjs`

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
