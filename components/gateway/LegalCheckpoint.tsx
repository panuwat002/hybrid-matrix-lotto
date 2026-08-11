"use client";

import { useState } from "react";

type Props = {
  onAccept: () => void;
  pending?: boolean;
};

export function LegalCheckpoint({ onAccept, pending = false }: Props) {
  const [checked, setChecked] = useState(false);
  const disabled = !checked || pending;

  return (
    <section className="max-w-2xl mx-auto rounded-2xl border border-matrix-cyan/30 bg-matrix-dim/60 p-6 shadow-[0_0_40px_-10px_#00d4ff]">
      <h2 className="text-xl font-thai text-matrix-cyan mb-4">
        ข้อตกลงก่อนเข้าใช้งาน
      </h2>
      <p className="text-sm leading-relaxed text-matrix-green/90 mb-4">
        ระบบนี้เกิดจากการคำนวณทางสถิติและคณิตศาสตร์เพื่อความบันเทิงเท่านั้น
        <span className="text-matrix-cyan font-semibold">
          {" "}ไม่มีการรับประกันผลการออกรางวัลใดๆ{" "}
        </span>
        การใช้งานถือว่าคุณเข้าใจว่าเลขที่แสดงเป็นผลจากอัลกอริทึม
        ไม่ใช่การทำนายผลจริง
      </p>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-5 w-5 accent-matrix-green cursor-pointer"
          disabled={pending}
        />
        <span className="font-thai text-sm">
          ฉันได้อ่านและยอมรับเงื่อนไขข้างต้น
        </span>
      </label>
      <button
        onClick={onAccept}
        disabled={disabled}
        className="mt-6 w-full py-3 rounded-lg font-mono font-semibold uppercase tracking-widest bg-matrix-green text-matrix-bg disabled:bg-matrix-dim disabled:text-matrix-green/40 disabled:cursor-not-allowed transition"
      >
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ Dashboard"}
      </button>
    </section>
  );
}
