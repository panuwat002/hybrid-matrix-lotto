"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DateSelector } from "./DateSelector";
import { GenerateButton } from "./GenerateButton";
import { ResultCard } from "./ResultCard";
import { FeaturedPrize } from "./FeaturedPrize";
import { ResultHeader } from "./ResultHeader";
import { SupportSection } from "./SupportSection";
import { trackEvent } from "@/lib/analytics/events";
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
  const pickerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const scrollToPicker = () => {
    trackEvent("picker_scrollback");
    pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen p-6 md:p-12">
      <nav className="mx-auto mb-6 flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          className="font-thai text-sm text-matrix-cyan/80 transition hover:text-matrix-cyan"
        >
          ← หน้าหลัก
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="font-thai text-xs text-matrix-cyan/70 transition hover:text-matrix-cyan"
          >
            เกี่ยวกับสูตร
          </Link>
          <Link
            href="/privacy"
            className="font-thai text-xs text-matrix-cyan/70 transition hover:text-matrix-cyan"
          >
            ความเป็นส่วนตัว
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-matrix-cyan/60">
            Hybrid Matrix
          </span>
        </div>
      </nav>
      <h1 className="mb-8 text-center font-mono text-4xl text-matrix-green drop-shadow-[0_0_12px_#00ff9c] md:text-5xl">
        ANALYSIS DASHBOARD
      </h1>

      <div ref={pickerRef} className="mx-auto mb-12 max-w-xl space-y-4">
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
        <div ref={resultsRef}>
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
                kind="front3"
              />
              <ResultCard
                title="เลขท้าย 3 ตัว"
                numbers={result.data.backThree}
                kind="back3"
              />
              <ResultCard
                title="เลขท้าย 2 ตัว"
                numbers={[result.data.backTwo]}
                kind="back2"
              />
            </div>
          </div>
          <SupportSection />
          <div className="mx-auto mt-8 max-w-5xl text-center">
            <button
              onClick={scrollToPicker}
              className="font-thai text-sm text-matrix-cyan/80 transition hover:text-matrix-cyan"
            >
              ↑ เลือกงวดใหม่
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
