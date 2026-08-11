"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmUnlock } from "@/lib/actions/confirmUnlock";

export function PaymentMockup() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUnlock = () => {
    startTransition(async () => {
      await confirmUnlock();
      router.push("/dashboard");
    });
  };

  return (
    <section className="max-w-2xl mx-auto rounded-2xl border border-matrix-green/40 bg-matrix-dim/60 p-6">
      <h2 className="text-xl font-thai text-matrix-green mb-2">
        สนับสนุนค่าเซิร์ฟเวอร์เพื่อปลดล็อกระบบ
      </h2>
      <p className="text-sm font-thai text-matrix-cyan/80 mb-6">
        สแกน QR เพื่อโอน แล้วอัปโหลดสลิปเพื่อยืนยันการปลดล็อก
      </p>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Mock QR = deterministic square pattern */}
        <div className="flex-shrink-0 w-48 h-48 rounded-lg bg-white p-3 grid place-items-center">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {Array.from({ length: 100 }, (_, i) => {
              const x = i % 10;
              const y = Math.floor(i / 10);
              const fill = (x * 7 + y * 3) % 3 === 0 ? "#000" : "#fff";
              return <rect key={i} x={x * 10} y={y * 10} width="10" height="10" fill={fill} />;
            })}
          </svg>
        </div>

        <div className="flex-1 w-full">
          <label className="block w-full rounded-lg border-2 border-dashed border-matrix-cyan/40 p-6 text-center cursor-pointer hover:border-matrix-cyan transition">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <span className="font-thai text-matrix-cyan">
              {fileName ? `📎 ${fileName}` : "แตะเพื่ออัปโหลดสลิป (mockup)"}
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleUnlock}
        disabled={pending}
        className="mt-8 w-full py-3 rounded-lg font-mono font-semibold uppercase tracking-widest bg-matrix-green text-matrix-bg disabled:opacity-50 disabled:cursor-wait transition"
      >
        {pending ? "กำลังปลดล็อก..." : "ยืนยันการสนับสนุน"}
      </button>
    </section>
  );
}
