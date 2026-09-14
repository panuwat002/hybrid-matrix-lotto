"use client";

import { useState, useEffect } from "react";
import type { BacktestComparisonReport } from "@/lib/types";

export function BacktestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BacktestComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest");
      const json = await res.json();
      if (json.ok && json.data) {
        setReport(json.data);
      } else {
        setError(json.error || "ไม่สามารถโหลดข้อมูลสถิติได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!report) {
      fetchReport();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-matrix-cyan/40 bg-matrix-card/80 px-4 py-2 font-thai text-xs font-semibold text-matrix-cyan transition hover:border-matrix-cyan hover:bg-matrix-cyan/10"
      >
        <span>📊</span>
        <span>ดูรายงาน Backtest เปรียบเทียบสูตร 10 ปี</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-matrix-green/50 bg-[#0d0f17] p-6 shadow-[0_0_30px_rgba(0,255,156,0.2)]">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              ✕ ปิด
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-block rounded border border-matrix-green/30 bg-matrix-green/10 px-2.5 py-0.5 font-mono text-[11px] text-matrix-green">
                DATA SCIENCE BENCHMARK
              </div>
              <h2 className="mt-2 font-mono text-2xl font-bold text-matrix-green drop-shadow-[0_0_8px_#00ff9c]">
                10-YEAR HISTORICAL BACKTEST
              </h2>
              <p className="mt-1 font-thai text-xs text-slate-400">
                ทดสอบย้อนหลังจริงด้วยวิธี Walk-Forward Validation (ป้องกัน Data Leakage 100%)
              </p>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-matrix-green border-t-transparent" />
                <p className="mt-3 font-thai text-sm text-matrix-cyan">กำลังประมวลผล Backtest 240+ งวด...</p>
              </div>
            )}

            {error && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-center font-thai text-sm text-red-300">
                {error}
                <button
                  onClick={fetchReport}
                  className="mt-2 block mx-auto underline text-xs text-red-200"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            )}

            {report && (
              <div className="space-y-6">
                {/* Summary Banner */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-matrix-cyan/20 bg-matrix-cyan/5 p-3 text-center">
                    <div className="font-thai text-[11px] text-slate-400">จำนวนงวดที่ทดสอบ</div>
                    <div className="font-mono text-xl font-bold text-matrix-cyan">
                      {report.testedDrawsCount} งวด
                    </div>
                  </div>
                  <div className="rounded-lg border border-matrix-cyan/20 bg-matrix-cyan/5 p-3 text-center">
                    <div className="font-thai text-[11px] text-slate-400">โมเดลที่แนะนำสูงสุด</div>
                    <div className="font-mono text-base font-bold text-matrix-green">
                      {report.summaries[report.winnerId]?.modelName.split(" ")[0]}
                    </div>
                  </div>
                  <div className="rounded-lg border border-matrix-cyan/20 bg-matrix-cyan/5 p-3 text-center">
                    <div className="font-thai text-[11px] text-slate-400">สถานะสูตร</div>
                    <div className="font-thai text-xs font-semibold text-emerald-400">
                      ✓ ปรับจูนและเทียบเคียงแล้ว
                    </div>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto rounded-lg border border-matrix-cyan/20">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-matrix-cyan/10 font-thai text-matrix-cyan">
                      <tr>
                        <th className="p-3">ประเภทรางวัลที่วัดผล</th>
                        <th className="p-3 text-center">Hybrid Matrix</th>
                        <th className="p-3 text-center">Adaptive Frequency</th>
                        <th className="p-3 text-center">โมเดลที่เด่นกว่า</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-matrix-cyan/10 font-mono">
                      {(() => {
                        const h = report.summaries["hybrid-matrix"];
                        const a = report.summaries["adaptive-frequency"];
                        if (!h || !a) return null;

                        const rows = [
                          {
                            title: "เลขท้าย 2 ตัวล่าง (ตรงเป๊ะ)",
                            hRate: h.rates.backTwoRate,
                            hHits: h.metrics.backTwoExact,
                            aRate: a.rates.backTwoRate,
                            aHits: a.metrics.backTwoExact,
                          },
                          {
                            title: "เลขท้าย 2 ตัวบน (ตรงท้ายรางวัลที่ 1)",
                            hRate: h.rates.topTwoRate,
                            hHits: h.metrics.topTwoExact,
                            aRate: a.rates.topTwoRate,
                            aHits: a.metrics.topTwoExact,
                          },
                          {
                            title: "เลขหน้า 3 ตัว (ตรง 1 ใน 2 ชุด)",
                            hRate: h.rates.frontThreeRate,
                            hHits: h.metrics.frontThreeHits,
                            aRate: a.rates.frontThreeRate,
                            aHits: a.metrics.frontThreeHits,
                          },
                          {
                            title: "เลขท้าย 3 ตัว (ตรง 1 ใน 2 ชุด)",
                            hRate: h.rates.backThreeRate,
                            hHits: h.metrics.backThreeHits,
                            aRate: a.rates.backThreeRate,
                            aHits: a.metrics.backThreeHits,
                          },
                          {
                            title: "เลขวิ่ง 1 หลัก (ติดในรางวัลที่ 1 หรือ 2 ตัว)",
                            hRate: h.rates.runningOneRate,
                            hHits: h.metrics.runningOneHits,
                            aRate: a.rates.runningOneRate,
                            aHits: a.metrics.runningOneHits,
                          },
                          {
                            title: "เลขวิ่ง 2 หลัก (ติดในรางวัลที่ 1 ทั้ง 2 ตัว)",
                            hRate: h.rates.runningTwoRate,
                            hHits: h.metrics.runningTwoHits,
                            aRate: a.rates.runningTwoRate,
                            aHits: a.metrics.runningTwoHits,
                          },
                          {
                            title: "คะแนนรวมเชิงสถิติ (Composite Score)",
                            hRate: h.rates.compositeScore,
                            hHits: null,
                            aRate: a.rates.compositeScore,
                            aHits: null,
                            isScore: true,
                          },
                        ];

                        return rows.map((r, idx) => {
                          const aBetter = r.aRate > r.hRate;
                          const isEqual = r.aRate === r.hRate;
                          return (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? "bg-black/20" : "bg-matrix-cyan/[0.02]"}
                            >
                              <td className="p-3 font-thai text-slate-300 font-medium">
                                {r.title}
                              </td>
                              <td className="p-3 text-center text-slate-200">
                                {r.hRate}%{" "}
                                {r.hHits !== null && (
                                  <span className="text-[10px] text-slate-500">
                                    ({r.hHits} ครั้ง)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center text-matrix-green">
                                {r.aRate}%{" "}
                                {r.aHits !== null && (
                                  <span className="text-[10px] text-matrix-green/60">
                                    ({r.aHits} ครั้ง)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {isEqual ? (
                                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                                    สูสีกัน
                                  </span>
                                ) : aBetter ? (
                                  <span className="rounded bg-matrix-green/20 px-2 py-0.5 text-[10px] text-matrix-green border border-matrix-green/40">
                                    Adaptive Frequency ✦
                                  </span>
                                ) : (
                                  <span className="rounded bg-matrix-cyan/20 px-2 py-0.5 text-[10px] text-matrix-cyan border border-matrix-cyan/40">
                                    Hybrid Matrix ✦
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Data Science Conclusion Box */}
                <div className="rounded-lg border border-matrix-green/30 bg-matrix-green/5 p-4">
                  <h3 className="flex items-center gap-2 font-thai text-sm font-semibold text-matrix-green">
                    <span>💡</span>
                    <span>บทวิเคราะห์คำตอบ: &ldquo;งวดที่แล้วไม่เข้าเป้า ควรปรับสูตรดีไหม?&rdquo;</span>
                  </h3>
                  <div className="mt-2 space-y-2 font-thai text-xs leading-relaxed text-slate-300">
                    <p>
                      <strong>1. ธรรมชาติของการสุ่ม (Stochastic Variance):</strong> สลากกินแบ่งมีความน่าจะเป็นทางสถิติอิสระในแต่ละงวด การที่สูตรใดสูตรหนึ่งไม่เข้าเป้าในงวดล่าสุดเป็นเรื่องปกติ ไม่ควรเปลี่ยนสูตรไปมาตามอารมณ์งวดต่องวด
                    </p>
                    <p>
                      <strong>2. ผลการทดสอบ 10 ปีจริง:</strong> {report.recommendation}
                    </p>
                    <p>
                      <strong>3. คำแนะนำในการใช้งาน:</strong> ท่านสามารถสลับเลือกโมเดลที่ต้องการได้ทันทีจากหน้าจอ Dashboard หากต้องการเน้นความถี่เลขเด่นให้เลือก <em>Adaptive Frequency</em> หรือหากต้องการพลังแห่งค่าคงที่ควอนตัมให้เลือก <em>Hybrid Matrix</em>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
