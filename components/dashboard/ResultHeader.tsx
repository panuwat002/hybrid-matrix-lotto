"use client";

import type { DrawDate } from "@/lib/types";
import { formatThaiDate } from "@/lib/format";

type Props = {
  targetDate: DrawDate;
  tensionScore: number;
  computedAt: Date;
};

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ResultHeader({ targetDate, tensionScore, computedAt }: Props) {
  const clamped = Math.max(0, Math.min(100, tensionScore));

  return (
    <div className="mx-auto mb-6 max-w-5xl border-b border-matrix-cyan/20 pb-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="font-thai text-[10px] uppercase tracking-[0.3em] text-matrix-cyan/70">
            งวด
          </span>
          <h2 className="mt-1 font-mono text-2xl text-matrix-green md:text-3xl">
            {formatThaiDate(targetDate)}
          </h2>
          <p className="mt-1 font-thai text-[11px] text-matrix-green/70">
            คำนวณเมื่อ {formatTime(computedAt)} น.
          </p>
        </div>

        <div className="min-w-[240px] md:max-w-xs md:flex-1">
          <div className="mb-1 flex items-baseline justify-between font-mono text-[10px] text-matrix-cyan/70">
            <span className="tracking-widest">STATISTICAL TENSION</span>
            <span className="text-matrix-cyan">{clamped.toFixed(2)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-matrix-dim">
            <div
              className="h-full bg-matrix-cyan shadow-[0_0_10px_#00d4ff]"
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
