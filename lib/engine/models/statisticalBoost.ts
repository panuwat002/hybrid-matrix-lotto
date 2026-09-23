import "server-only";
import type { DrawDate, HistoricalDraw, MatrixResult } from "@/lib/types";

const N_CANDIDATES = 10;

/** How many top-scoring pairs feed the back-two coverage set (before reversals). */
const N_BACK_TWO_RANKED = 5;

/**
 * Statistical Boost Model
 *
 * Ensemble of 3 statistical signals:
 * 1. Exponential Recency-Weighted Positional Frequency
 * 2. Markov Transition Probabilities (position-wise)
 * 3. Gap Pressure (digits overdue at each position)
 *
 * Generates multiple candidates and selects the highest-scoring one.
 */
export function calculateStatisticalBoost(
  targetDate: DrawDate,
  draws: HistoricalDraw[],
): MatrixResult {
  if (draws.length === 0) {
    throw new Error("calculateStatisticalBoost: draws must be non-empty");
  }

  const total = draws.length;
  const lastDraw = draws[total - 1];

  // ── 1. Exponential recency-weighted positional frequency ──
  const positionalScores: number[][] = Array.from({ length: 6 }, () =>
    new Array(10).fill(0),
  );
  const digitScores = new Array(10).fill(0);

  draws.forEach((draw, idx) => {
    // Exponential decay: recent draws get exponentially higher weight
    const recencyWeight = Math.exp(((idx - total + 1) / total) * 3) + 0.1;

    for (let pos = 0; pos < 6; pos++) {
      const d = Number(draw.firstPrize[pos]);
      if (!Number.isNaN(d)) {
        positionalScores[pos][d] += recencyWeight;
        digitScores[d] += recencyWeight;
      }
    }
  });

  // ── 2. Markov transition matrix per position ──
  // For each position: P(next_digit | prev_digit)
  // With Laplace smoothing (start at 1) to avoid zero probabilities
  const transitions: number[][][] = Array.from({ length: 6 }, () =>
    Array.from({ length: 10 }, () => new Array(10).fill(1)),
  );

  for (let i = 1; i < draws.length; i++) {
    const prev = draws[i - 1].firstPrize;
    const curr = draws[i].firstPrize;
    const recency = Math.exp(((i - total + 1) / total) * 2) + 0.1;

    for (let pos = 0; pos < 6; pos++) {
      const prevD = Number(prev[pos]);
      const currD = Number(curr[pos]);
      if (!Number.isNaN(prevD) && !Number.isNaN(currD)) {
        transitions[pos][prevD][currD] += recency;
      }
    }
  }

  // ── 3. Gap pressure per position ──
  // Digits that haven't appeared at a position for a long time get boosted
  const gapPressure: number[][] = Array.from({ length: 6 }, () =>
    new Array(10).fill(0),
  );

  for (let pos = 0; pos < 6; pos++) {
    for (let d = 0; d < 10; d++) {
      let gap = total;
      for (let i = total - 1; i >= 0; i--) {
        if (Number(draws[i].firstPrize[pos]) === d) {
          gap = total - 1 - i;
          break;
        }
      }
      gapPressure[pos][d] = Math.pow(gap + 1, 1.3);
    }
  }

  // ── 4. Ensemble scores per position ──
  // Combine all 3 signals with calibrated weights
  const ensembleScores: number[][] = Array.from({ length: 6 }, () =>
    new Array(10).fill(0),
  );
  const lastDigits = lastDraw.firstPrize.split("").map(Number);

  for (let pos = 0; pos < 6; pos++) {
    const prevDigit = lastDigits[pos];
    for (let d = 0; d < 10; d++) {
      const freqSignal = positionalScores[pos][d];
      const markovSignal = !Number.isNaN(prevDigit)
        ? transitions[pos][prevDigit][d]
        : 1;
      const gapSignal = gapPressure[pos][d];

      // Weighted ensemble: freq 40%, markov 35%, gap 25%
      ensembleScores[pos][d] =
        freqSignal * 0.4 + markovSignal * 0.35 + gapSignal * 0.25;
    }
  }

  // ── 5. Deterministic seed from targetDate ──
  let seed = 0;
  for (let i = 0; i < targetDate.length; i++) {
    seed = (seed * 31 + targetDate.charCodeAt(i)) >>> 0;
  }

  // Mulberry32 seeded PRNG
  const prng = (s: number) => {
    return () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rand = prng(seed);

  // ── 6. Weighted sampling helper ──
  const weightedSample = (scores: number[]): number => {
    const totalScore = scores.reduce((a, b) => a + b, 0);
    let threshold = rand() * totalScore;
    for (let d = 0; d < 10; d++) {
      threshold -= scores[d];
      if (threshold <= 0) return d;
    }
    return 9;
  };

  // ── 7. Generate N candidates and score them ──
  const candidateScoreMap: { num: string; score: number }[] = [];

  for (let c = 0; c < N_CANDIDATES; c++) {
    const digits: number[] = [];
    let totalCandidateScore = 0;

    for (let pos = 0; pos < 6; pos++) {
      const d = weightedSample(ensembleScores[pos]);
      digits.push(d);
      totalCandidateScore += ensembleScores[pos][d];
    }

    candidateScoreMap.push({
      num: digits.join(""),
      score: totalCandidateScore,
    });
  }

  // Sort by composite score (highest first)
  candidateScoreMap.sort((a, b) => b.score - a.score);

  const firstPrize = candidateScoreMap[0].num;
  const otherCandidates = candidateScoreMap.slice(1).map((c) => c.num);

  // ── 8. Adjacent ──
  const pNum = Number(firstPrize);
  const low = String((pNum - 1 + 1_000_000) % 1_000_000).padStart(6, "0");
  const high = String((pNum + 1) % 1_000_000).padStart(6, "0");

  // ── 9. Back-2 from pair frequency with exponential recency ──
  const pairFreq = new Map<string, number>();
  draws.forEach((draw, idx) => {
    const recency = Math.exp(((idx - total + 1) / total) * 3) + 0.1;
    const pEnd = draw.firstPrize.slice(-2);
    pairFreq.set(pEnd, (pairFreq.get(pEnd) ?? 0) + recency);
    if (draw.twoDigits && draw.twoDigits.length === 2) {
      pairFreq.set(
        draw.twoDigits,
        (pairFreq.get(draw.twoDigits) ?? 0) + recency * 2.0,
      );
    }
  });

  const sortedPairs = Array.from(pairFreq.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const ranked = sortedPairs
    .slice(0, N_BACK_TWO_RANKED)
    .map(([pair]) => pair);
  if (ranked.length === 0) {
    ranked.push(firstPrize.slice(-2));
  }

  // Each ranked pair drags its reversed form in with it: a Thai punter playing
  // a pair plays it กลับ too, and the set stays closed under reversal.
  const backTwoSet: string[] = [];
  for (const pair of ranked) {
    for (const p of [pair, `${pair[1]}${pair[0]}`]) {
      if (!backTwoSet.includes(p)) backTwoSet.push(p);
    }
  }

  const backTwo = backTwoSet[0];

  // ── 10. Front-3 and Back-3 using ensemble ──
  const f1 = `${weightedSample(ensembleScores[0])}${weightedSample(ensembleScores[1])}${weightedSample(ensembleScores[2])}`;
  const f2 = `${weightedSample(ensembleScores[1])}${weightedSample(ensembleScores[2])}${weightedSample(ensembleScores[3])}`;
  const b1 = `${weightedSample(ensembleScores[3])}${weightedSample(ensembleScores[4])}${weightedSample(ensembleScores[5])}`;
  const b2 = `${weightedSample(ensembleScores[2])}${weightedSample(ensembleScores[4])}${weightedSample(ensembleScores[5])}`;

  // ── 11. Tension score (variance-based, normalized) ──
  const meanDigitScore =
    digitScores.reduce((a: number, b: number) => a + b, 0) / 10;
  const variance =
    digitScores.reduce(
      (acc: number, s: number) => acc + (s - meanDigitScore) ** 2,
      0,
    ) / 10;
  const tensionScore = Math.min(
    99.99,
    Math.max(10.0, Number((variance / 5).toFixed(2))),
  );

  return {
    targetDate,
    firstPrize,
    adjacent: [low, high],
    frontThree: [f1, f2],
    backThree: [b1, b2],
    backTwo,
    backTwoSet,
    tensionScore,
    modelId: "statistical-boost",
    candidates: otherCandidates,
  };
}
