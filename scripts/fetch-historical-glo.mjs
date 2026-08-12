// Fetches 10 years of real Thai government lottery first-prize numbers
// from the community-maintained archive at:
//
//   https://github.com/vicha-w/thai-lotto-archive
//
// File naming: lottonumbers/YYYY-MM-DD.txt (Gregorian). Each file has a
// line beginning `FIRST xxxxxx` with the 6-digit first prize.
//
// Run: `node scripts/fetch-historical-glo.mjs`
//   → overwrites lib/data/historical.json in HistoricalDraw[] shape
//   → after running: `pnpm test -u` to refresh the golden snapshot,
//     then commit both files.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const REPO_BASE =
  "https://raw.githubusercontent.com/vicha-w/thai-lotto-archive/master/lottonumbers";
const END_YEAR = 2025; // Gregorian; adjust when re-fetching later
const NUM_YEARS = 10;
const START_YEAR = END_YEAR - NUM_YEARS + 1; // 2016
const POLITE_DELAY_MS = 120; // don't hammer github raw

async function fetchDraw(y, m, d) {
  const url = `${REPO_BASE}/${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}.txt`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/^FIRST\s+(\d{6})/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function toBeDateStr(y, m, d) {
  const yBe = y + 543;
  return `${String(d).padStart(2, "0")}${String(m).padStart(2, "0")}${yBe}`;
}

function isoSortKey(be) {
  // "16082568" → "25680816" (sortable ascending = chronological)
  return be.slice(4) + be.slice(2, 4) + be.slice(0, 2);
}

async function main() {
  const results = [];
  const tried = [];

  for (let y = START_YEAR; y <= END_YEAR; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const target of [1, 16]) {
        let found = false;
        // Try target, target+1, target+2 (Thai lottery occasionally shifts
        // by 1-2 days for holidays; the archive uses the actual draw date)
        for (const offset of [0, 1, 2]) {
          const d = target + offset;
          if (d > 31) break;
          const prize = await fetchDraw(y, m, d);
          if (prize) {
            results.push({ date: toBeDateStr(y, m, d), firstPrize: prize });
            found = true;
            process.stderr.write(`\r✓ ${results.length} draws collected — latest ${y}-${m}-${d}: ${prize}   `);
            break;
          }
          await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
        }
        if (!found) tried.push(`${y}-${m}-${target}`);
      }
    }
  }

  results.sort((a, b) => isoSortKey(a.date).localeCompare(isoSortKey(b.date)));

  const out = "lib/data/historical.json";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(results, null, 2) + "\n", "utf8");

  process.stderr.write("\n");
  console.error(`Wrote ${results.length} draws to ${out}`);
  if (tried.length) {
    console.error(`(${tried.length} target dates had no data: ${tried.slice(0, 5).join(", ")}${tried.length > 5 ? ", ..." : ""})`);
  }
  console.error(
    `\nFirst 3:  ${results.slice(0, 3).map((r) => `${r.date}=${r.firstPrize}`).join(", ")}`,
  );
  console.error(
    `Last 3:   ${results.slice(-3).map((r) => `${r.date}=${r.firstPrize}`).join(", ")}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
