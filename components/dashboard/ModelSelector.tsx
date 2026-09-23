"use client";

import type { FormulaModelId } from "@/lib/types";

type Props = {
  value: FormulaModelId;
  onChange: (id: FormulaModelId) => void;
};

export function ModelSelector({ value, onChange }: Props) {
  const models = [
    {
      id: "hybrid-matrix" as FormulaModelId,
      name: "Hybrid Matrix",
      tag: "Deterministic φ³",
      subtitle: "สมการค่าคงที่สากล (Golden Ratio, π, e)",
      desc: "สูตรหลัก คำนวณแบบสถิติผสานทฤษฎีควอนตัมคณิตศาสตร์",
    },
    {
      id: "adaptive-frequency" as FormulaModelId,
      name: "Adaptive Frequency",
      tag: "Tuned Frequency",
      subtitle: "สถิติความถี่ถ่วงน้ำหนักตามกาลเวลา (Time-Decay)",
      desc: "สูตรปรับจูน เน้นคู่เลขเด่นและแนวโน้มที่ออกบ่อยย้อนหลัง",
    },
    {
      id: "statistical-boost" as FormulaModelId,
      name: "Statistical Boost",
      tag: "Ensemble ×10",
      subtitle: "Markov + Gap Pressure + Exponential Recency",
      desc: "สูตรเร่งพลัง สร้างเลข 10 ชุด เลือกชุดที่ดีที่สุด + ชุดเลขท้าย 2 ตัวพร้อมเลขกลับ",
    },
  ];

  return (
    <div className="space-y-2">
      <label className="block font-thai text-xs tracking-wider text-matrix-cyan/80">
        เลือกสูตร / โมเดลการคำนวณ
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {models.map((m) => {
          const isSelected = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`group relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-matrix-green bg-matrix-green/10 shadow-[0_0_15px_rgba(0,255,156,0.15)]"
                  : "border-matrix-cyan/30 bg-matrix-card/60 hover:border-matrix-cyan/60 hover:bg-matrix-card"
              }`}
            >
              <div className="mb-1.5 flex w-full items-center justify-between">
                <span
                  className={`font-mono text-sm font-bold transition ${
                    isSelected ? "text-matrix-green" : "text-slate-200 group-hover:text-white"
                  }`}
                >
                  {m.name}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    isSelected
                      ? "border-matrix-green/80 bg-matrix-green/20 text-matrix-green"
                      : "border-matrix-cyan/30 bg-matrix-cyan/10 text-matrix-cyan/70"
                  }`}
                >
                  {m.tag}
                </span>
              </div>
              <p className="font-thai text-xs font-medium text-matrix-cyan/90">
                {m.subtitle}
              </p>
              <p className="mt-1 font-thai text-[11px] leading-relaxed text-slate-400">
                {m.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
