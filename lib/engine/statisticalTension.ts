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

  // 2. gap = draws-since-last-appearance (from latest draw at end)
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
