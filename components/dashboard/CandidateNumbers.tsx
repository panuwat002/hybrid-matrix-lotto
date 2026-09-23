"use client";

import { useState } from "react";

type Props = {
  candidates: string[];
};

function formatPrize(num: string): string {
  return `${num.slice(0, 3)} ${num.slice(3)}`;
}

export function CandidateNumbers({ candidates }: Props) {
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (num: string, idx: number) => {
    navigator.clipboard.writeText(num);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  if (candidates.length === 0) return null;

  return (
    <div>
      <div className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/5 to-amber-600/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🍀</span>
          <h3 className="font-thai text-sm font-bold tracking-wide text-amber-400">
            ชุดผู้ท้าชิงรางวัลที่ 1 — Ensemble Candidates
          </h3>
          <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400/80">
            +{candidates.length} ชุด
          </span>
        </div>
        <p className="mb-1 font-thai text-[11px] text-amber-300/60">
          เลขที่สกัดจาก Ensemble scoring เรียงตามคะแนนสถิติสูง → ต่ำ
        </p>
        <p className="mb-3 font-thai text-[11px] leading-relaxed text-amber-300/40">
          โอกาสถูกรางวัลที่ 1 ของทั้ง {candidates.length + 1} ชุดรวมกัน ={" "}
          {candidates.length + 1} ใน 1,000,000 — แบ็คเทสต์ย้อนหลัง 215 งวด เข้า 0
          ครั้ง การเพิ่มจำนวนชุดไม่ได้ทำให้สูตรแม่นขึ้น แค่ซื้อกว้างขึ้นเท่านั้นครับ
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {candidates.map((num, idx) => (
            <button
              key={idx}
              onClick={() => handleCopy(num, idx)}
              className="group relative flex items-center justify-between rounded-lg border border-amber-400/20 bg-matrix-bg/60 px-3 py-2.5 transition hover:border-amber-400/50 hover:bg-amber-400/10"
            >
              <span className="font-mono text-lg font-bold tracking-[0.15em] text-amber-300 transition group-hover:text-amber-200">
                {formatPrize(num)}
              </span>
              <span className="ml-2 rounded border border-amber-400/30 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-400/60 transition group-hover:bg-amber-400/20 group-hover:text-amber-300">
                {copied === idx ? "✓" : "copy"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
