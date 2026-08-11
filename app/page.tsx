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
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="font-mono text-5xl md:text-6xl font-bold text-matrix-green drop-shadow-[0_0_15px_#00ff9c]">
          HYBRID MATRIX
        </h1>
        <p className="mt-3 font-thai text-matrix-cyan">
          ระบบวิเคราะห์ตัวเลขด้วย Deterministic Cosmic Algorithm
        </p>
      </header>

      {step === "hero" && (
        <section className="max-w-2xl mx-auto text-center">
          <p className="font-thai text-matrix-green/80 mb-8">
            ผสานพลังของ Golden Ratio, Pi, และสถิติย้อนหลัง 10 ปี
            เพื่อสกัดชุดตัวเลขที่มีแรงเค้นทางสถิติสูงสุด
          </p>
          <button
            onClick={() => setStep("legal")}
            className="px-8 py-3 rounded-lg font-mono uppercase tracking-widest bg-matrix-green text-matrix-bg hover:shadow-[0_0_25px_#00ff9c] transition"
          >
            เข้าสู่ระบบวิเคราะห์
          </button>
        </section>
      )}

      {step === "legal" && (
        <LegalCheckpoint onAccept={handleAccept} pending={pending} />
      )}
    </main>
  );
}
