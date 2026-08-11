"use client";

import { useState } from "react";
import { DateSelector } from "./DateSelector";
import { GenerateButton } from "./GenerateButton";
import { ResultCard } from "./ResultCard";
import type { MatrixResult } from "@/lib/types";

function defaultDate(): string {
  // งวดถัดไป: 1 หรือ 16 ของเดือน
  const now = new Date();
  const day = now.getDate() >= 16 ? "01" : "16";
  const monthIdx = now.getDate() >= 16 ? now.getMonth() + 1 : now.getMonth();
  const month = ((monthIdx % 12) + 1).toString().padStart(2, "0");
  const yearBumps =
    now.getDate() >= 16 && now.getMonth() === 11 ? 1 : 0;
  const year = now.getFullYear() + 543 + yearBumps;
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
    </main>
  );
}
