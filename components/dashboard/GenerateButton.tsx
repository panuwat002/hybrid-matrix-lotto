"use client";

import { useTransition } from "react";
import { generateMatrix } from "@/lib/actions/generateMatrix";
import type { MatrixResult } from "@/lib/types";

type Props = {
  date: string;
  onResult: (r: MatrixResult) => void;
  onError: (msg: string) => void;
};

export function GenerateButton({ date, onResult, onError }: Props) {
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      try {
        const r = await generateMatrix(date);
        onResult(r);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "UNKNOWN";
        onError(
          msg === "UNLOCK_REQUIRED"
            ? "ยังไม่ปลดล็อกระบบ"
            : msg === "INVALID_DATE"
              ? "รูปแบบวันที่ไม่ถูกต้อง"
              : "เกิดข้อผิดพลาด",
        );
      }
    });
  };

  return (
    <button
      onClick={run}
      disabled={pending || !date}
      className="w-full py-3 rounded-lg font-mono font-semibold uppercase tracking-widest bg-matrix-green text-matrix-bg disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {pending ? "กำลังคำนวณ..." : "รันการวิเคราะห์"}
    </button>
  );
}
