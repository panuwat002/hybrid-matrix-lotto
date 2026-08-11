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
              : msg === "RATE_LIMITED"
                ? "เรียกใช้บ่อยเกินไป ลองใหม่ในอีก 1 นาที"
                : "เกิดข้อผิดพลาด",
        );
      }
    });
  };

  return (
    <button
      onClick={run}
      disabled={pending || !date}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-matrix-green py-3 font-mono font-semibold uppercase tracking-widest text-matrix-bg transition disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending && (
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-matrix-bg border-t-transparent"
        />
      )}
      <span>{pending ? "กำลังคำนวณ..." : "รันการวิเคราะห์"}</span>
    </button>
  );
}
