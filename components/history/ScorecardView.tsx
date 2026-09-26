import type { FormulaModelId, ModelScore, Scorecard } from "@/lib/types";
import { formatThaiDate, groupDigits } from "@/lib/format";

const MODEL_LABELS: Record<FormulaModelId, string> = {
  "hybrid-matrix": "Hybrid Matrix",
  "adaptive-frequency": "Adaptive Frequency",
  "statistical-boost": "Statistical Boost",
};

const MODEL_IDS = Object.keys(MODEL_LABELS) as FormulaModelId[];

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={
        on
          ? "rounded border border-matrix-green/50 bg-matrix-green/15 px-1.5 py-0.5 font-thai text-[10px] text-matrix-green"
          : "rounded border border-matrix-green/10 px-1.5 py-0.5 font-thai text-[10px] text-matrix-green/25"
      }
    >
      {label}
    </span>
  );
}

function ScoreBadges({ score }: { score: ModelScore }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge on={score.backTwoExact} label="ท้าย 2 ตรง" />
      <Badge on={score.backTwoReversed} label="ท้าย 2 กลับ" />
      <Badge on={score.backTwoSetHit} label="อยู่ในชุด" />
      <Badge on={score.frontThreeHit} label="หน้า 3" />
      <Badge on={score.backThreeHit} label="ท้าย 3" />
      <Badge on={score.firstPrizeExact} label="รางวัลที่ 1" />
    </div>
  );
}

export function ScorecardView({ scorecard }: { scorecard: Scorecard }) {
  const { rows, totals } = scorecard;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-matrix-cyan/20 bg-matrix-dim/50 p-4">
        <p className="font-thai text-[12px] leading-relaxed text-matrix-cyan/80">
          หน้านี้แสดง<strong className="text-matrix-cyan"> เฉพาะเลขที่บันทึกไว้ก่อนหวยออก</strong> เท่านั้น
          ไม่ใช่การคำนวณย้อนหลัง — สูตรเปลี่ยนทีหลังก็ไม่ทำให้ตัวเลขในหน้านี้เปลี่ยน
        </p>
        <p className="mt-2 font-thai text-[11px] leading-relaxed text-matrix-green/50">
          ผลไม่กี่งวดยังบอกอะไรไม่ได้ครับ ต้องสะสมหลายสิบงวดถึงจะแยกออกว่าเป็นฝีมือสูตรหรือความบังเอิญ
        </p>
      </section>

      {rows.length === 0 ? (
        <section
          data-testid="scorecard-empty"
          className="rounded-xl border border-dashed border-matrix-green/25 p-8 text-center"
        >
          <p className="font-thai text-sm text-matrix-green/70">
            ยังไม่มีงวดที่บันทึกไว้
          </p>
          <p className="mt-2 font-thai text-[11px] text-matrix-green/40">
            สถิติจะเริ่มสะสมตั้งแต่งวดแรกที่บันทึก และจะไม่มีการเติมข้อมูลย้อนหลัง
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {MODEL_IDS.map((id) => {
              const t = totals[id];
              return (
                <div
                  key={id}
                  data-testid={`total-${id}`}
                  className="rounded-xl border border-matrix-green/25 bg-matrix-dim/60 p-4"
                >
                  <h3 className="font-mono text-xs uppercase tracking-widest text-matrix-cyan">
                    {MODEL_LABELS[id]}
                  </h3>
                  <p className="mt-2 font-thai text-[11px] text-matrix-green/70">
                    วัดผลแล้ว {t.drawsScored} งวด
                  </p>
                  <dl className="mt-2 space-y-1 font-thai text-[11px] text-matrix-green/80">
                    <div className="flex justify-between">
                      <dt>ท้าย 2 ตัว ตรงเป๊ะ</dt>
                      <dd className="font-mono">{t.backTwoExact}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>ท้าย 2 ตัว เลขกลับ</dt>
                      <dd className="font-mono">{t.backTwoReversed}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>อยู่ในชุดที่ให้ไว้</dt>
                      <dd className="font-mono">{t.backTwoSetHits}</dd>
                    </div>
                    <div className="flex justify-between text-matrix-green/45">
                      <dt>└ สุ่มล้วนควรได้</dt>
                      <dd className="font-mono">
                        {t.backTwoSetBaselineRate}% ของงวด
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </section>

          <section data-testid="scorecard-rows" className="space-y-3">
            {rows.map((row) => (
              <article
                key={row.date}
                data-testid={`row-${row.date}`}
                className="rounded-xl border border-matrix-green/25 bg-matrix-dim/50 p-4"
              >
                <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-matrix-green/15 pb-2">
                  <h3 className="font-mono text-lg text-matrix-green">
                    {formatThaiDate(row.date)}
                  </h3>
                  {row.actual ? (
                    <p className="font-thai text-[11px] text-matrix-cyan/80">
                      ผลจริง — รางวัลที่ 1{" "}
                      <span className="font-mono text-matrix-cyan">
                        {groupDigits(row.actual.firstPrize)}
                      </span>
                      {" · ท้าย 2 ตัว "}
                      <span className="font-mono text-matrix-cyan">
                        {row.actual.twoDigits ?? row.actual.firstPrize.slice(-2)}
                      </span>
                    </p>
                  ) : (
                    <p className="font-thai text-[11px] text-amber-300/80">
                      รอผล — บันทึกเมื่อ {row.recordedAt}
                    </p>
                  )}
                </header>

                <div className="space-y-2">
                  {MODEL_IDS.filter((id) => id in row.models).map((id) => {
                    const score = row.models[id];
                    return (
                      <div
                        key={id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1"
                      >
                        <span className="min-w-[150px] font-mono text-[11px] text-matrix-cyan/70">
                          {MODEL_LABELS[id]}
                        </span>
                        {score ? (
                          <ScoreBadges score={score} />
                        ) : (
                          <span className="font-thai text-[11px] text-matrix-green/35">
                            ยังไม่ได้วัดผล
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
