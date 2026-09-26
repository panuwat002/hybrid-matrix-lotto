// Record what the live site serves for an upcoming draw, so the /history page
// can score it later against the published result.
//
// Run: pnpm record 01102569 [--url http://localhost:3000]

import { readFileSync, writeFileSync } from "node:fs";
import { assertRecordable, appendPrediction } from "./lib/predictionLog.mjs";

const HISTORICAL_PATH = "lib/data/historical.json";
const PREDICTIONS_PATH = "lib/data/predictions.json";
const DEFAULT_BASE = "https://hybrid-matrix-lotto.vercel.app";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  const args = process.argv.slice(2);
  const date = args.find((a) => !a.startsWith("--"));
  const urlFlag = args.indexOf("--url");
  const base = urlFlag !== -1 ? args[urlFlag + 1] : DEFAULT_BASE;

  if (!date) {
    console.error("ใช้: pnpm record <DDMMYYYY> [--url <base>]  เช่น  pnpm record 01102569");
    process.exit(1);
  }

  const published = readJson(HISTORICAL_PATH);
  const recorded = readJson(PREDICTIONS_PATH);

  assertRecordable(date, published, recorded);

  const endpoint = `${base}/api/predict?date=${date}`;
  console.log(`ดึงจาก ${endpoint}`);

  const res = await fetch(endpoint);
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(`เรียก API ไม่สำเร็จ (${res.status}): ${body.error ?? "unknown"}`);
  }

  const entry = {
    date,
    recordedAt: new Date().toISOString().slice(0, 10),
    models: body.data.models,
  };

  writeFileSync(
    PREDICTIONS_PATH,
    JSON.stringify(appendPrediction(recorded, entry), null, 2) + "\n",
    "utf8",
  );

  console.log(`\nบันทึกงวด ${date} แล้ว (${Object.keys(entry.models).length} สูตร)`);
  for (const [id, m] of Object.entries(entry.models)) {
    console.log(`  ${id.padEnd(20)} รางวัลที่1 ${m.firstPrize}  ท้าย2 ${m.backTwo}`);
  }
  console.log(`\nอย่าลืม commit ${PREDICTIONS_PATH} ก่อนหวยออก`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
