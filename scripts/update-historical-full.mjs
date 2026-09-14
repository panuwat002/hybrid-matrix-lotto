// Script to fetch 10-year historical Thai lottery archive with full prize data:
// FIRST (รางวัลที่ 1), TWO (เลขท้าย 2 ตัว), THREE_FIRST (เลขหน้า 3 ตัว), THREE_LAST (เลขท้าย 3 ตัว), NEAR_FIRST (ข้างเคียง)
// Source: https://github.com/vicha-w/thai-lotto-archive

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const REPO_BASE =
  "https://raw.githubusercontent.com/vicha-w/thai-lotto-archive/master/lottonumbers";
const END_YEAR = 2026;
const START_YEAR = 2016;
const POLITE_DELAY_MS = 60;

async function fetchDraw(y, m, d) {
  const url = `${REPO_BASE}/${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}.txt`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    
    const firstMatch = text.match(/^FIRST\s+(\d{6})/m);
    if (!firstMatch) return null;

    const twoMatch = text.match(/^TWO\s+(\d{2})/m);
    const threeFirstMatch = text.match(/^THREE_FIRST\s+([\d\s]+)/m);
    const threeLastMatch = text.match(/^THREE_LAST\s+([\d\s]+)/m);
    const nearFirstMatch = text.match(/^NEAR_FIRST\s+([\d\s]+)/m);

    const parseNumbers = (match, len) => {
      if (!match) return [];
      return match[1].trim().split(/\s+/).filter((s) => s.length === len);
    };

    return {
      firstPrize: firstMatch[1],
      twoDigits: twoMatch ? twoMatch[1] : undefined,
      threeFront: parseNumbers(threeFirstMatch, 3),
      threeBack: parseNumbers(threeLastMatch, 3),
      nearFirst: parseNumbers(nearFirstMatch, 6),
    };
  } catch {
    return null;
  }
}

function toBeDateStr(y, m, d) {
  const yBe = y + 543;
  return `${String(d).padStart(2, "0")}${String(m).padStart(2, "0")}${yBe}`;
}

function isoSortKey(be) {
  return be.slice(4) + be.slice(2, 4) + be.slice(0, 2);
}

async function main() {
  console.log("Fetching historical Thai lottery data (2016-2026)...");
  const results = [];
  let successCount = 0;

  for (let y = START_YEAR; y <= END_YEAR; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const target of [1, 16]) {
        for (const offset of [0, 1, 2, -1]) {
          const d = target + offset;
          if (d < 1 || d > 31) continue;
          const prizeData = await fetchDraw(y, m, d);
          if (prizeData) {
            results.push({
              date: toBeDateStr(y, m, d),
              ...prizeData,
            });
            successCount++;
            process.stdout.write(`\r✓ Collected ${successCount} draws (latest ${y}-${m}-${d}: ${prizeData.firstPrize})`);
            break;
          }
          await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
        }
      }
    }
  }

  results.sort((a, b) => isoSortKey(a.date).localeCompare(isoSortKey(b.date)));

  const out = "lib/data/historical.json";
  mkdirSync(dirname(out), { recursive: true });
  
  if (results.length > 50) {
    writeFileSync(out, JSON.stringify(results, null, 2) + "\n", "utf8");
    console.log(`\nSuccessfully wrote ${results.length} enriched draws to ${out}`);
  } else {
    console.log(`\nWarning: Only fetched ${results.length} draws. Keeping existing data if available.`);
  }
}

main().catch((err) => {
  console.error("Fetch error:", err);
  process.exit(1);
});
