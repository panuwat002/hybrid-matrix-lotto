"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LegalCheckpoint } from "@/components/gateway/LegalCheckpoint";
import { VisitorCounter } from "@/components/analytics/VisitorCounter";
import { confirmUnlock } from "@/lib/actions/confirmUnlock";
import { trackEvent } from "@/lib/analytics/events";

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
            <span className="text-matrix-cyan/70">$ preview</span>
            <span className="text-matrix-green/80">D=16082569</span>
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
              onClick={() => {
                trackEvent("hero_enter");
                setStep("legal");
              }}
              className="rounded-lg bg-matrix-green px-8 py-3 font-mono uppercase tracking-widest text-matrix-bg transition hover:shadow-[0_0_25px_#00ff9c]"
            >
              เข้าสู่ระบบวิเคราะห์
            </button>
          </div>
          <div className="mt-6">
            <a
              href="/about"
              className="font-thai text-xs text-matrix-cyan/70 underline-offset-4 transition hover:text-matrix-cyan hover:underline"
            >
              อ่านเพิ่มเติมเกี่ยวกับสูตร →
            </a>
          </div>
        </section>
      )}

      {step === "legal" && (
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => {
              trackEvent("legal_back");
              setStep("hero");
            }}
            disabled={pending}
            className="mb-4 font-thai text-sm text-matrix-cyan/70 transition hover:text-matrix-cyan disabled:opacity-40"
          >
            ← กลับ
          </button>
          <LegalCheckpoint onAccept={handleAccept} pending={pending} />
        </div>
      )}

      <footer className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-4 border-t border-matrix-cyan/15 pt-4 font-thai text-xs text-matrix-green/70 md:gap-6">
        <Link href="/about" className="transition hover:text-matrix-cyan">
          เกี่ยวกับสูตร
        </Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="transition hover:text-matrix-cyan">
          นโยบายความเป็นส่วนตัว
        </Link>
        <span aria-hidden>·</span>
        <VisitorCounter />
      </footer>
    </main>
  );
}
