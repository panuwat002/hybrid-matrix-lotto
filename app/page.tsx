"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LegalCheckpoint } from "@/components/gateway/LegalCheckpoint";
import { confirmUnlock } from "@/lib/actions/confirmUnlock";

type Step = "hero" | "legal";

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("hero");
  const [pending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      await confirmUnlock();
      router.push("/dashboard");
    });
  };

  return (
    <main className="min-h-screen p-6 md:p-12">
      <header className="mx-auto mb-12 max-w-4xl text-center">
        <h1 className="hero-glow font-mono text-5xl font-bold text-matrix-green md:text-6xl">
          HYBRID MATRIX
        </h1>
        <p className="mt-3 font-thai text-matrix-cyan">
          ระบบวิเคราะห์ตัวเลขด้วย Deterministic Cosmic Algorithm
        </p>
      </header>

      {step === "hero" && (
        <section className="mx-auto max-w-2xl text-center">
          <p className="mb-6 font-thai text-matrix-green/80">
            ผสานพลังของ Golden Ratio, Pi, และสถิติย้อนหลัง 10 ปี
            เพื่อสกัดชุดตัวเลขที่มีแรงเค้นทางสถิติสูงสุด
          </p>

          <div className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 rounded-lg border border-matrix-cyan/25 bg-matrix-dim/40 px-4 py-2 font-mono text-xs">
            <span className="text-matrix-cyan/50">$ preview</span>
            <span className="text-matrix-green/60">D=16082569</span>
            <span className="text-matrix-cyan/40">→</span>
            <span className="text-matrix-green drop-shadow-[0_0_6px_#00ff9c]">
              048139
            </span>
            <span className="text-matrix-cyan/30">|</span>
            <span className="text-matrix-green drop-shadow-[0_0_6px_#00ff9c]">
              834
            </span>
            <span className="text-matrix-cyan/30">|</span>
            <span className="text-matrix-green drop-shadow-[0_0_6px_#00ff9c]">
              53
            </span>
          </div>

          <div>
            <button
              onClick={() => setStep("legal")}
              className="rounded-lg bg-matrix-green px-8 py-3 font-mono uppercase tracking-widest text-matrix-bg transition hover:shadow-[0_0_25px_#00ff9c]"
            >
              เข้าสู่ระบบวิเคราะห์
            </button>
          </div>
        </section>
      )}

      {step === "legal" && (
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => setStep("hero")}
            disabled={pending}
            className="mb-4 font-thai text-sm text-matrix-cyan/70 transition hover:text-matrix-cyan disabled:opacity-40"
          >
            ← กลับ
          </button>
          <LegalCheckpoint onAccept={handleAccept} pending={pending} />
        </div>
      )}
    </main>
  );
}
