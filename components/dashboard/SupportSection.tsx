"use client";

import { useState } from "react";

/**
 * Soft support CTA — shown ONLY after user has seen a result.
 * Not a gate. Not required. Collapsible.
 * Image gracefully falls back to a placeholder when the file is missing.
 */
export function SupportSection() {
  const [open, setOpen] = useState(true);
  const [imgOk, setImgOk] = useState(true);

  return (
    <section className="max-w-md mx-auto mt-12 rounded-2xl border border-matrix-cyan/25 bg-matrix-dim/50 p-5 text-center">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="text-left flex-1">
          <h3 className="font-thai text-matrix-cyan text-base font-semibold">
            ถ้าเว็บมีประโยชน์ ช่วยสนับสนุนค่าเซิร์ฟเวอร์เล็กๆ น้อยๆ ได้ครับ
          </h3>
          <p className="text-[11px] font-thai text-matrix-green/60 mt-1">
            ไม่บังคับ — ใช้งานได้เต็มระบบไม่มีข้อจำกัด 💚
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "ซ่อน QR" : "แสดง QR"}
          className="shrink-0 rounded border border-matrix-cyan/40 text-matrix-cyan text-[10px] font-mono uppercase tracking-wider px-2 py-1 hover:bg-matrix-cyan/10 transition"
        >
          {open ? "ซ่อน" : "แสดง QR"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {imgOk ? (
            <div className="mx-auto w-64 rounded-lg bg-white p-2 shadow-[0_0_25px_-10px_#00d4ff]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/support-qr.png"
                alt="PromptPay QR — MR PANUWAT SAKUNTEM"
                className="w-full h-auto block"
                onError={() => setImgOk(false)}
              />
            </div>
          ) : (
            <div className="mx-auto w-64 h-64 rounded-lg border-2 border-dashed border-matrix-cyan/40 bg-matrix-dim/60 flex flex-col items-center justify-center p-4">
              <div className="text-matrix-cyan text-3xl mb-2">📷</div>
              <p className="font-thai text-xs text-matrix-cyan/80 leading-relaxed">
                ยังไม่มีรูป QR
              </p>
              <p className="font-mono text-[10px] text-matrix-green/60 mt-2">
                วางไฟล์ที่
                <br />
                <code className="text-matrix-green">public/support-qr.png</code>
              </p>
            </div>
          )}
          <p className="mt-3 font-thai text-xs text-matrix-cyan/80">
            พร้อมเพย์ • MR PANUWAT SAKUNTEM
          </p>
          <p className="mt-1 font-thai text-[10px] text-matrix-green/50">
            สแกนด้วยแอปธนาคาร → โอนตามใจ (5฿, 10฿, 100฿ ก็มีความหมาย)
          </p>
        </div>
      )}
    </section>
  );
}
