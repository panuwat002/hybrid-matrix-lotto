// 10-Year Backtest Benchmark CLI for Hybrid Matrix vs Adaptive Frequency
// Run: `pnpm backtest` or `node scripts/run-backtest.mjs`

import { readFileSync } from "node:fs";
import Decimal from "decimal.js";

Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const PHI = new Decimal("1.61803398874989484820458683436563811772030917980576");
const PI = new Decimal("3.14159265358979323846264338327950288419716939937511");
const E = new Decimal("2.71828182845904523536028747135266249775724709369996");
const TEN_TO_15 = new Decimal(10).pow(15);
const ONE_THIRD = new Decimal(1).div(3);

function pad(n, len) {
  return n.toString().padStart(len, "0");
}

function computeStatisticalTension(draws) {
  const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const freq = new Map(DIGITS.map((d) => [d, 0]));
  for (const draw of draws) {
    for (const ch of draw.firstPrize) {
      const d = Number(ch);
      freq.set(d, (freq.get(d) ?? 0) + 1);
    }
  }

  const gap = new Map();
  for (const d of DIGITS) {
    let g = draws.length;
    for (let i = draws.length - 1; i >= 0; i--) {
      if (draws[i].firstPrize.includes(String(d))) {
        g = draws.length - 1 - i;
        break;
      }
    }
    gap.set(d, g);
  }

  const totalDigits = draws.length * 6;
  const mean = totalDigits / 10;
  const tension = DIGITS.map((d) => {
    const f = freq.get(d) ?? 0;
    const g = gap.get(d) ?? draws.length;
    return { digit: d, value: (f - mean) ** 2 * (g + 1) };
  });

  tension.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return a.digit - b.digit;
  });

  const top3 = tension.slice(0, 3).map((t) => t.digit).join("");
  return new Decimal(top3).div(1000);
}

function runHybridMatrix(targetDate, draws) {
  const S_T = computeStatisticalTension(draws);
  const D = new Decimal(targetDate);
  const X = D.mul(S_T).mul(PHI.pow(3)).mul(PI);

  const prize = X.mul(PI).floor().mod(1_000_000);
  const firstPrize = pad(prize, 6);

  const p = prize.toNumber();
  const low = pad(new Decimal((p - 1 + 1_000_000) % 1_000_000), 6);
  const high = pad(new Decimal((p + 1) % 1_000_000), 6);

  const backTwo = pad(X.floor().mod(100), 2);
  const front1 = pad(X.mul(TEN_TO_15).floor().mod(1000), 3);
  const front2 = pad(X.mul(E).floor().mod(1000), 3);
  const back1 = pad(X.sqrt().floor().mod(1000), 3);
  const back2 = pad(X.pow(ONE_THIRD).floor().mod(1000), 3);

  return {
    firstPrize,
    adjacent: [low, high],
    frontThree: [front1, front2],
    backThree: [back1, back2],
    backTwo,
  };
}

function runAdaptiveFrequency(targetDate, draws) {
  const digitScores = new Array(10).fill(0);
  const positionalScores = Array.from({ length: 6 }, () => new Array(10).fill(0));
  const pairFreq = new Map();

  const total = draws.length;
  draws.forEach((draw, idx) => {
    const recencyWeight = 0.5 + (idx / total) * 1.5;
    for (let pos = 0; pos < 6; pos++) {
      const d = Number(draw.firstPrize[pos]);
      if (!Number.isNaN(d)) {
        digitScores[d] += recencyWeight;
        positionalScores[pos][d] += recencyWeight;
      }
    }

    const pEnd = draw.firstPrize.slice(-2);
    pairFreq.set(pEnd, (pairFreq.get(pEnd) ?? 0) + recencyWeight);
    if (draw.twoDigits && draw.twoDigits.length === 2) {
      pairFreq.set(draw.twoDigits, (pairFreq.get(draw.twoDigits) ?? 0) + recencyWeight * 1.5);
    }
  });

  let seed = 0;
  for (let i = 0; i < targetDate.length; i++) {
    seed = (seed * 31 + targetDate.charCodeAt(i)) >>> 0;
  }

  const prng = (s) => () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = prng(seed);

  const selectDigitForPos = (pos) => {
    const scores = positionalScores[pos];
    const totalScore = scores.reduce((a, b) => a + b, 0);
    let threshold = rand() * totalScore;
    for (let d = 0; d < 10; d++) {
      threshold -= scores[d];
      if (threshold <= 0) return d;
    }
    return 9;
  };

  const prizeDigits = [];
  for (let pos = 0; pos < 6; pos++) {
    prizeDigits.push(selectDigitForPos(pos));
  }
  const firstPrize = prizeDigits.join("");
  const pNum = Number(firstPrize);
  const low = String((pNum - 1 + 1_000_000) % 1_000_000).padStart(6, "0");
  const high = String((pNum + 1) % 1_000_000).padStart(6, "0");

  const sortedPairs = Array.from(pairFreq.entries()).sort((a, b) => b[1] - a[1]);
  const pairIndex = Math.floor(rand() * Math.min(5, sortedPairs.length));
  const backTwo = sortedPairs[pairIndex] ? sortedPairs[pairIndex][0] : firstPrize.slice(-2);

  const front1 = `${selectDigitForPos(0)}${selectDigitForPos(1)}${selectDigitForPos(2)}`;
  const front2 = `${selectDigitForPos(1)}${selectDigitForPos(2)}${selectDigitForPos(3)}`;
  const back1 = `${selectDigitForPos(3)}${selectDigitForPos(4)}${selectDigitForPos(5)}`;
  const back2 = `${selectDigitForPos(2)}${selectDigitForPos(4)}${selectDigitForPos(5)}`;

  return {
    firstPrize,
    adjacent: [low, high],
    frontThree: [front1, front2],
    backThree: [back1, back2],
    backTwo,
  };
}

function runStatisticalBoost(targetDate, draws) {
  const N_CANDIDATES = 10;
  const N_BACK_TWO_RANKED = 5;
  const total = draws.length;
  const lastDraw = draws[total - 1];

  // Exponential recency-weighted positional frequency
  const positionalScores = Array.from({ length: 6 }, () => new Array(10).fill(0));
  const digitScores = new Array(10).fill(0);

  draws.forEach((draw, idx) => {
    const recencyWeight = Math.exp(((idx - total + 1) / total) * 3) + 0.1;
    for (let pos = 0; pos < 6; pos++) {
      const d = Number(draw.firstPrize[pos]);
      if (!Number.isNaN(d)) {
        positionalScores[pos][d] += recencyWeight;
        digitScores[d] += recencyWeight;
      }
    }
  });

  // Markov transition matrix per position (Laplace smoothed)
  const transitions = Array.from({ length: 6 }, () =>
    Array.from({ length: 10 }, () => new Array(10).fill(1))
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

  // Gap pressure per position
  const gapPressure = Array.from({ length: 6 }, () => new Array(10).fill(0));
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

  // Ensemble scores
  const ensembleScores = Array.from({ length: 6 }, () => new Array(10).fill(0));
  const lastDigits = lastDraw.firstPrize.split("").map(Number);
  for (let pos = 0; pos < 6; pos++) {
    const prevDigit = lastDigits[pos];
    for (let d = 0; d < 10; d++) {
      const freqSignal = positionalScores[pos][d];
      const markovSignal = !Number.isNaN(prevDigit) ? transitions[pos][prevDigit][d] : 1;
      const gapSignal = gapPressure[pos][d];
      ensembleScores[pos][d] = freqSignal * 0.4 + markovSignal * 0.35 + gapSignal * 0.25;
    }
  }

  // Deterministic seed
  let seed = 0;
  for (let i = 0; i < targetDate.length; i++) {
    seed = (seed * 31 + targetDate.charCodeAt(i)) >>> 0;
  }
  const prng = (s) => () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = prng(seed);

  const weightedSample = (scores) => {
    const totalScore = scores.reduce((a, b) => a + b, 0);
    let threshold = rand() * totalScore;
    for (let d = 0; d < 10; d++) {
      threshold -= scores[d];
      if (threshold <= 0) return d;
    }
    return 9;
  };

  // Generate N candidates
  const candidateScoreMap = [];
  for (let c = 0; c < N_CANDIDATES; c++) {
    const digits = [];
    let totalCandidateScore = 0;
    for (let pos = 0; pos < 6; pos++) {
      const d = weightedSample(ensembleScores[pos]);
      digits.push(d);
      totalCandidateScore += ensembleScores[pos][d];
    }
    candidateScoreMap.push({ num: digits.join(""), score: totalCandidateScore });
  }
  candidateScoreMap.sort((a, b) => b.score - a.score);

  const firstPrize = candidateScoreMap[0].num;
  const candidates = candidateScoreMap.slice(1).map(c => c.num);
  const pNum = Number(firstPrize);
  const low = String((pNum - 1 + 1_000_000) % 1_000_000).padStart(6, "0");
  const high = String((pNum + 1) % 1_000_000).padStart(6, "0");

  // Pair frequency for back-2
  const pairFreq = new Map();
  draws.forEach((draw, idx) => {
    const recency = Math.exp(((idx - total + 1) / total) * 3) + 0.1;
    const pEnd = draw.firstPrize.slice(-2);
    pairFreq.set(pEnd, (pairFreq.get(pEnd) ?? 0) + recency);
    if (draw.twoDigits && draw.twoDigits.length === 2) {
      pairFreq.set(draw.twoDigits, (pairFreq.get(draw.twoDigits) ?? 0) + recency * 2.0);
    }
  });
  const sortedPairs = Array.from(pairFreq.entries()).sort((a, b) => b[1] - a[1]);
  const ranked = sortedPairs.slice(0, N_BACK_TWO_RANKED).map(([pair]) => pair);
  if (ranked.length === 0) ranked.push(firstPrize.slice(-2));

  // Each ranked pair drags its reversed form (เลขกลับ) in with it.
  const backTwoSet = [];
  for (const pair of ranked) {
    for (const cand of [pair, `${pair[1]}${pair[0]}`]) {
      if (!backTwoSet.includes(cand)) backTwoSet.push(cand);
    }
  }
  const backTwo = backTwoSet[0];

  const f1 = `${weightedSample(ensembleScores[0])}${weightedSample(ensembleScores[1])}${weightedSample(ensembleScores[2])}`;
  const f2 = `${weightedSample(ensembleScores[1])}${weightedSample(ensembleScores[2])}${weightedSample(ensembleScores[3])}`;
  const b1 = `${weightedSample(ensembleScores[3])}${weightedSample(ensembleScores[4])}${weightedSample(ensembleScores[5])}`;
  const b2 = `${weightedSample(ensembleScores[2])}${weightedSample(ensembleScores[4])}${weightedSample(ensembleScores[5])}`;

  return {
    firstPrize,
    adjacent: [low, high],
    frontThree: [f1, f2],
    backThree: [b1, b2],
    backTwo,
    backTwoSet,
    candidates,
  };
}

function main() {
  const dataPath = "lib/data/historical.json";
  const draws = JSON.parse(readFileSync(dataPath, "utf8"));

  const minWindow = 30;
  const testDraws = draws.slice(minWindow);
  const N = testDraws.length;

  console.log("================================================================================");
  console.log("    HYBRID MATRIX LOTTO — 10-YEAR HISTORICAL BACKTEST BENCHMARK (3 MODELS)      ");
  console.log("================================================================================");
  console.log(`Total Draws in Archive:  ${draws.length} draws`);
  console.log(`Evaluated (Walk-Forward): ${N} draws (Start: ${testDraws[0].date} → End: ${testDraws[N - 1].date})`);
  console.log("Methodology:              Strict Walk-Forward Validation (Zero Data Leakage)");
  console.log("--------------------------------------------------------------------------------\n");

  const models = [
    { id: "hybrid", name: "Hybrid Matrix (φ³)", runner: runHybridMatrix },
    { id: "adaptive", name: "Adaptive Frequency", runner: runAdaptiveFrequency },
    { id: "boost", name: "Statistical Boost", runner: runStatisticalBoost },
  ];

  const results = {};
  for (const m of models) {
    results[m.id] = {
      firstPrizeExact: 0,
      adjacentHits: 0,
      backTwoExact: 0,
      backTwoReversedHits: 0,
      backTwoSetHits: 0,
      setSizeTotal: 0,
      topTwoExact: 0,
      frontThreeHits: 0,
      backThreeHits: 0,
      runningOneHits: 0,
      runningTwoHits: 0,
      candidateHits: 0,
    };
  }

  for (let i = minWindow; i < draws.length; i++) {
    const actual = draws[i];
    const history = draws.slice(0, i);

    const actualFirst = actual.firstPrize;
    const actualTwo = actual.twoDigits ?? actualFirst.slice(-2);
    const actualTopTwo = actualFirst.slice(-2);
    const actualFront3 = actual.threeFront && actual.threeFront.length > 0 ? actual.threeFront : [actualFirst.slice(0, 3)];
    const actualBack3 = actual.threeBack && actual.threeBack.length > 0 ? actual.threeBack : [actualFirst.slice(-3)];
    const actualNear = actual.nearFirst && actual.nearFirst.length > 0
      ? actual.nearFirst
      : [
          String((Number(actualFirst) - 1 + 1_000_000) % 1_000_000).padStart(6, "0"),
          String((Number(actualFirst) + 1) % 1_000_000).padStart(6, "0"),
        ];

    for (const m of models) {
      const pred = m.runner(actual.date, history);
      const res = results[m.id];

      if (pred.firstPrize === actualFirst) res.firstPrizeExact++;
      if (actualNear.includes(pred.firstPrize) || pred.adjacent.includes(actualFirst)) res.adjacentHits++;
      if (pred.backTwo === actualTwo) res.backTwoExact++;
      if (`${pred.backTwo[1]}${pred.backTwo[0]}` === actualTwo) res.backTwoReversedHits++;

      // A model with no coverage set covers exactly one pair: baseline 1%.
      const coverageSet = pred.backTwoSet && pred.backTwoSet.length > 0 ? pred.backTwoSet : [pred.backTwo];
      res.setSizeTotal += coverageSet.length;
      if (coverageSet.includes(actualTwo)) res.backTwoSetHits++;
      if (pred.backTwo === actualTopTwo) res.topTwoExact++;
      if (actualFront3.includes(pred.frontThree[0]) || actualFront3.includes(pred.frontThree[1])) res.frontThreeHits++;
      if (actualBack3.includes(pred.backThree[0]) || actualBack3.includes(pred.backThree[1])) res.backThreeHits++;

      const d1 = pred.backTwo[0];
      const d2 = pred.backTwo[1];
      if (actualFirst.includes(d1) || actualFirst.includes(d2) || actualTwo.includes(d1) || actualTwo.includes(d2)) {
        res.runningOneHits++;
      }
      if (actualFirst.includes(d1) && actualFirst.includes(d2)) {
        res.runningTwoHits++;
      }

      // Track candidate hits (any of 5 numbers match first prize)
      if (pred.candidates && pred.candidates.length > 0) {
        const allNums = [pred.firstPrize, ...pred.candidates];
        if (allNums.some(n => n === actualFirst)) {
          res.candidateHits++;
        }
      }
    }
  }

  const calcRate = (hits) => ((hits / N) * 100).toFixed(2);

  const metrics = [
    { label: "เลขท้าย 2 ตัวล่าง (ตรงเป๊ะ)", key: "backTwoExact" },
    { label: "เลขท้าย 2 ตัวล่าง (เลขกลับ)", key: "backTwoReversedHits" },
    { label: "เลขท้าย 2 ตัวล่าง (นับทั้งชุด)", key: "backTwoSetHits" },
    { label: "  └ เส้นฐานสุ่มล้วนของชุด (ควรชนะเส้นนี้)", key: "__baseline" },
    { label: "เลขท้าย 2 ตัวบน (ท้ายรางวัลที่ 1)", key: "topTwoExact" },
    { label: "เลขหน้า 3 ตัว (ตรง 1 ใน 2 ชุด)", key: "frontThreeHits" },
    { label: "เลขท้าย 3 ตัว (ตรง 1 ใน 2 ชุด)", key: "backThreeHits" },
    { label: "เลขวิ่ง 1 ตัว (ติดในรางวัลที่ 1/2ตัวล่าง)", key: "runningOneHits" },
    { label: "เลขวิ่ง 2 ตัว (ติดในรางวัลที่ 1 ครบ2ตัว)", key: "runningTwoHits" },
    { label: "รางวัลที่ 1 (ตรงเป๊ะ 6 หลัก)", key: "firstPrizeExact" },
    { label: "★ รางวัลที่1 (10 ชุดรวม, Boost only)", key: "candidateHits" },
  ];

  console.log("+------------------------------------------------+-----------------+-----------------+-----------------+");
  console.log("| หมวดรางวัลที่วัดผล                             | Hybrid Matrix   | Adaptive Freq   | Stat. Boost     |");
  console.log("+------------------------------------------------+-----------------+-----------------+-----------------+");

  for (const m of metrics) {
    // The chance baseline is a coverage percentage, not a hit count: a set of
    // k pairs covers k/100 of the space for free.
    if (m.key === "__baseline") {
      const cols = ["hybrid", "adaptive", "boost"].map((id) =>
        `${(results[id].setSizeTotal / N).toFixed(2)}%`.padStart(15, " "),
      );
      console.log(`| ${m.label.padEnd(46, " ")} | ${cols.join(" | ")} |`);
      continue;
    }

    const hHits = results.hybrid[m.key];
    const aHits = results.adaptive[m.key];
    const bHits = results.boost[m.key];
    const hRate = calcRate(hHits);
    const aRate = calcRate(aHits);
    const bRate = calcRate(bHits);

    const rates = [
      { name: "Hybrid", rate: Number(hRate) },
      { name: "Adaptive", rate: Number(aRate) },
      { name: "Boost", rate: Number(bRate) },
    ];
    const maxRate = Math.max(...rates.map(r => r.rate));
    const winners = rates.filter(r => r.rate === maxRate).map(r => r.name);
    let winner = winners.length === 3 ? "สูสี" : winners.join("/") + " (+)";

    const labelPad = m.label.padEnd(46, " ");
    const hCol = `${hRate}% (${hHits})`.padStart(15, " ");
    const aCol = `${aRate}% (${aHits})`.padStart(15, " ");
    const bCol = `${bRate}% (${bHits})`.padStart(15, " ");

    console.log(`| ${labelPad} | ${hCol} | ${aCol} | ${bCol} |`);
  }
  console.log("+------------------------------------------------+-----------------+-----------------+-----------------+");

  console.log("\n================================================================================");
  console.log("                          ข้อสรุปเชิงสถิติ (INSIGHTS)                           ");
  console.log("================================================================================");
  console.log("1. Statistical Boost ใช้ Ensemble ของ 3 สัญญาณ:");
  console.log("   → Markov Transition: เลขอะไรมักตามหลังเลขอะไร ณ แต่ละตำแหน่ง");
  console.log("   → Gap Pressure: เลขที่ไม่ออกนานจะมีแรงกดดันสะสม (ยิ่งนาน ยิ่งมีโอกาส)");
  console.log("   → Exponential Recency: ให้น้ำหนักงวดล่าสุดมากเป็นพิเศษ (แทนที่จะเป็นเส้นตรง)");
  console.log("2. วิธีอ่านแถว 'นับทั้งชุด':");
  console.log("   → ชุด k คู่ ครอบคลุม k/100 ของพื้นที่เลขอยู่แล้วโดยไม่ต้องมีสูตร");
  console.log("   → ตัวเลขนั้นคือ 'เส้นฐานสุ่มล้วน' ใต้แถว — ถ้าไม่ชนะเส้นนี้ชัดๆ");
  console.log("     แปลว่าได้มาจากการแทงกว้างขึ้น ไม่ใช่จากสูตรที่แม่นขึ้น");
  console.log("3. รางวัลที่ 1 ตรงเป๊ะ 6 หลัก คือ 1/1,000,000 ต่อชุด และแต่ละงวดเป็นอิสระต่อกัน");
  console.log("   → ยิง 10 ชุด × 215 งวด = 2,150 ใบ ค่าคาดหวังที่จะเข้า ≈ 0.002 ครั้ง");
  console.log("   → แถว 'รางวัลที่1' ที่เป็น 0.00% จึงเป็นผลตามทฤษฎี ไม่ใช่จุดที่จูนให้ดีขึ้นได้");
  console.log("================================================================================\n");
}

main();

