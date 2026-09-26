import Link from "next/link";
import HISTORICAL from "@/lib/data/historical.json";
import PREDICTIONS from "@/lib/data/predictions.json";
import { buildScorecard } from "@/lib/engine/scorecard";
import { ScorecardView } from "@/components/history/ScorecardView";
import type { HistoricalDraw, RecordedPrediction } from "@/lib/types";

export const metadata = {
  title: "ย้อนดูงวดก่อน | Hybrid Matrix",
  description:
    "เลขที่เว็บให้ไว้ก่อนหวยออกในแต่ละงวด เทียบกับผลจริง",
};

export default function HistoryPage() {
  const scorecard = buildScorecard(
    PREDICTIONS as RecordedPrediction[],
    HISTORICAL as HistoricalDraw[],
  );

  return (
    <main className="min-h-screen p-6 md:p-12">
      <nav className="mx-auto mb-8 flex max-w-5xl items-center justify-between">
        <Link
          href="/dashboard"
          className="font-thai text-sm text-matrix-cyan/80 transition hover:text-matrix-cyan"
        >
          ← กลับหน้าวิเคราะห์
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-matrix-green/50">
          Track Record
        </span>
      </nav>

      <header className="mx-auto mb-6 max-w-5xl">
        <h1 className="font-mono text-3xl text-matrix-green md:text-4xl">
          ย้อนดูงวดก่อน
        </h1>
        <p className="mt-2 font-thai text-sm text-matrix-green/70">
          เว็บให้เลขอะไรไว้ และผลออกจริงเป็นอะไร
        </p>
      </header>

      <ScorecardView scorecard={scorecard} />
    </main>
  );
}
