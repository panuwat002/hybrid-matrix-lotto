"use client";

import { useState } from "react";
import { DateSelector } from "./DateSelector";
import { GenerateButton } from "./GenerateButton";
import { ResultCard } from "./ResultCard";
import { FeaturedPrize } from "./FeaturedPrize";
import { ResultHeader } from "./ResultHeader";
import { SupportSection } from "./SupportSection";
import type { MatrixResult } from "@/lib/types";

function defaultDate(): string {
  const now = new Date();
  const day = now.getDate() >= 16 ? "01" : "16";
  const monthIdx = now.getDate() >= 16 ? now.getMonth() + 1 : now.getMonth();
  const month = ((monthIdx % 12) + 1).toString().padStart(2, "0");
  const yearBumps = now.getDate() >= 16 && now.getMonth() === 11 ? 1 : 0;
  const year = now.getFullYear() + 543 + yearBumps;
  return `${day}${month}${year}`;
}

type ResultBundle = { data: MatrixResult; computedAt: Date };

export function DashboardClient() {
  const [date, setDate] = useState(defaultDate);
  const [result, setResult] = useState<ResultBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="min-h-screen p-6 md:p-12">
      <h1 className="mb-8 text-center font-mono text-3xl text-matrix-green drop-shadow-[0_0_10px_#00ff9c]">
        ANALYSIS DASHBOARD
      </h1>

      <div className="mx-auto mb-12 max-w-xl space-y-4">
        <DateSelector value={date} onChange={setDate} />
        <GenerateButton
          date={date}
          onResult={(r) => {
            setResult({ data: r, computedAt: new Date() });
            setError(null);
          }}
          onError={(e) => {
            setError(e);
            setResult(null);
          }}
        />
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 font-thai text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      {result && (
        <>
          <ResultHeader
            targetDate={result.data.targetDate}
            tensionScore={result.data.tensionScore}
            computedAt={result.computedAt}
          />
          <div className="mx-auto max-w-5xl space-y-4">
            <FeaturedPrize
              firstPrize={result.data.firstPrize}
              adjacent={result.data.adjacent}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ResultCard
                title="เลขหน้า 3 ตัว"
                numbers={result.data.frontThree}
              />
              <ResultCard
                title="เลขท้าย 3 ตัว"
                numbers={result.data.backThree}
              />
              <ResultCard title="เลขท้าย 2 ตัว" numbers={[result.data.backTwo]} />
            </div>
          </div>
          <SupportSection />
        </>
      )}
    </main>
  );
}
