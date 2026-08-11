"use client";

import { useState } from "react";

/**
 * Soft support CTA — shown ONLY after user has seen a result.
 * Compact (default closed) and never blocking.
 */
export function SupportSection() {
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  return (
    <section className="mx-auto mt-10 max-w-sm rounded-2xl border border-matrix-cyan/25 bg-matrix-dim/40 p-4 text-center">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-left">
          <h3 className="font-thai text-sm font-semibold text-matrix-cyan">
            ถ้าเว็บมีประโยชน์ ช่วยสนับสนุนค่าเซิร์ฟเวอร์ได้ครับ
          </h3>
          <p className="mt-1 font-thai text-[10px] text-matrix-green/50">
            ไม่บังคับ — ระบบใช้งานได้เต็มโดยไม่มีข้อจำกัด 💚
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 rounded border border-matrix-cyan/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-matrix-cyan transition hover:bg-matrix-cyan/10"
        >
          {open ? "ซ่อน" : "แสดง QR"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {imgOk ? (
            <div className="mx-auto w-44 rounded-lg bg-white p-2 shadow-[0_0_25px_-10px_#00d4ff]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/support-qr.png"
                alt="PromptPay QR — MR PANUWAT SAKUNTEM"
                className="block h-auto w-full"
                onError={() => setImgOk(false)}
              />
            </div>
          ) : (
            <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-matrix-cyan/40 bg-matrix-dim/60 p-3">
              <div className="mb-2 text-2xl text-matrix-cyan">📷</div>
              <p className="text-center font-thai text-[10px] leading-relaxed text-matrix-cyan/80">
                วางไฟล์ที่
                <br />
                <code className="text-matrix-green">public/support-qr.png</code>
              </p>
            </div>
          )}
          <p className="mt-3 font-thai text-[11px] text-matrix-cyan/70">
            พร้อมเพย์ • MR PANUWAT SAKUNTEM
          </p>
          <p className="mt-1 font-thai text-[10px] text-matrix-green/50">
            5฿, 10฿, 100฿ ก็มีความหมาย
          </p>
        </div>
      )}
    </section>
  );
}
