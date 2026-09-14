import "server-only";
import Decimal from "decimal.js";
import type { DrawDate, HistoricalDraw, MatrixResult } from "@/lib/types";

// Positional weighted frequency and pair correlation model
export function calculateAdaptiveFrequency(
  targetDate: DrawDate,
  draws: HistoricalDraw[],
): MatrixResult {
  if (draws.length === 0) {
    throw new Error("calculateAdaptiveFrequency: draws must be non-empty");
  }

  // 1. Compute recency-weighted frequency for each digit (0-9)
  // Recent draws have higher weights (exponential recency decay)
  const digitScores = new Array(10).fill(0);
  const positionalScores: number[][] = Array.from({ length: 6 }, () => new Array(10).fill(0));
  const pairFreq = new Map<string, number>();

  const total = draws.length;
  draws.forEach((draw, idx) => {
    // Weight increases linearly/exponentially towards the most recent draws
    const recencyWeight = 0.5 + (idx / total) * 1.5;

    // Analyze 6-digit firstPrize
    for (let pos = 0; pos < 6; pos++) {
      const d = Number(draw.firstPrize[pos]);
      if (!Number.isNaN(d)) {
        digitScores[d] += recencyWeight;
        positionalScores[pos][d] += recencyWeight;
      }
    }

    // Pair frequency for 2-digit (both from firstPrize end and twoDigits if present)
    const pEnd = draw.firstPrize.slice(-2);
    pairFreq.set(pEnd, (pairFreq.get(pEnd) ?? 0) + recencyWeight);

    if (draw.twoDigits && draw.twoDigits.length === 2) {
      pairFreq.set(draw.twoDigits, (pairFreq.get(draw.twoDigits) ?? 0) + recencyWeight * 1.5);
    }
  });

  // 2. Deterministic seed from targetDate (e.g. 16082569) to pick top candidates
  let seed = 0;
  for (let i = 0; i < targetDate.length; i++) {
    seed = (seed * 31 + targetDate.charCodeAt(i)) >>> 0;
  }

  // Mulberry32 seeded pseudo-random generator
  const prng = (s: number) => {
    return () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rand = prng(seed);

  // 3. Select 6 digits for firstPrize based on positional probability
  const selectDigitForPos = (pos: number): number => {
    const scores = positionalScores[pos];
    const totalScore = scores.reduce((a, b) => a + b, 0);
    let threshold = rand() * totalScore;
    for (let d = 0; d < 10; d++) {
      threshold -= scores[d];
      if (threshold <= 0) return d;
    }
    return 9;
  };

  const prizeDigits: number[] = [];
  for (let pos = 0; pos < 6; pos++) {
    prizeDigits.push(selectDigitForPos(pos));
  }
  const firstPrize = prizeDigits.join("");

  // Adjacent
  const pNum = Number(firstPrize);
  const low = String((pNum - 1 + 1_000_000) % 1_000_000).padStart(6, "0");
  const high = String((pNum + 1) % 1_000_000).padStart(6, "0");

  // 4. Select top 2-digit
  // Sort pairs by frequency desc
  const sortedPairs = Array.from(pairFreq.entries()).sort((a, b) => b[1] - a[1]);
  // Choose top pair with small deterministic perturbation
  const pairIndex = Math.floor(rand() * Math.min(5, sortedPairs.length));
  const backTwo = sortedPairs[pairIndex] ? sortedPairs[pairIndex][0] : firstPrize.slice(-2);

  // 5. Select Front 3 and Back 3
  const front1 = `${selectDigitForPos(0)}${selectDigitForPos(1)}${selectDigitForPos(2)}`;
  const front2 = `${selectDigitForPos(1)}${selectDigitForPos(2)}${selectDigitForPos(3)}`;
  const back1 = `${selectDigitForPos(3)}${selectDigitForPos(4)}${selectDigitForPos(5)}`;
  const back2 = `${selectDigitForPos(2)}${selectDigitForPos(4)}${selectDigitForPos(5)}`;

  // Tension score: variance of digit scores normalized to [0, 100]
  const meanDigitScore = digitScores.reduce((a, b) => a + b, 0) / 10;
  const variance = digitScores.reduce((acc, s) => acc + (s - meanDigitScore) ** 2, 0) / 10;
  const tensionScore = Math.min(99.99, Math.max(10.0, Number((variance / 5).toFixed(2))));

  return {
    targetDate,
    firstPrize,
    adjacent: [low, high],
    frontThree: [front1, front2],
    backThree: [back1, back2],
    backTwo,
    tensionScore,
    modelId: "adaptive-frequency",
  };
}
