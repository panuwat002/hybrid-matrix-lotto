import { CopyButton } from "./CopyButton";
import { groupDigits } from "@/lib/format";

type Props = {
  title: string;
  numbers: string[];
  kind: "front3" | "back3" | "back2";
  /**
   * Extra pairs played alongside the headline number. Rendered as chips; a pair
   * whose mirror already appears earlier in the set is tagged กลับ.
   */
  coverageSet?: string[];
};

export function ResultCard({ title, numbers, kind, coverageSet }: Props) {
  const extras = (coverageSet ?? []).filter((p) => !numbers.includes(p));

  return (
    <article className="card-in rounded-xl border border-matrix-green/30 bg-matrix-dim/70 p-5 shadow-[0_0_20px_-8px_#00ff9c]">
      <h3 className="mb-3 font-thai text-xs uppercase tracking-[0.25em] text-matrix-cyan">
        {title}
      </h3>
      <ul className="space-y-2">
        {numbers.map((n, i) => (
          <li key={`${n}-${i}`} className="flex items-center justify-between">
            <span className="font-mono text-3xl tabular-nums text-matrix-green drop-shadow-[0_0_8px_#00ff9c]">
              {groupDigits(n)}
            </span>
            <CopyButton text={n} kind={kind} />
          </li>
        ))}
      </ul>

      {extras.length > 0 && (
        <div
          data-testid="back2-coverage"
          className="mt-4 border-t border-matrix-green/15 pt-3"
        >
          <p className="mb-2 font-thai text-[10px] uppercase tracking-[0.2em] text-matrix-cyan/60">
            ชุดเลขที่ครอบคลุม
          </p>
          <div className="flex flex-wrap gap-1.5">
            {extras.map((pair) => {
              const mirror = `${pair[1]}${pair[0]}`;
              const mirrorRank = (coverageSet ?? []).indexOf(mirror);
              // Only a pair whose mirror is actually ranked ahead of it is กลับ.
              const isReversed =
                mirror !== pair &&
                mirrorRank !== -1 &&
                mirrorRank < (coverageSet ?? []).indexOf(pair);

              return (
                <span
                  key={pair}
                  data-testid={`back2-pair-${pair}`}
                  className="flex items-center gap-1 rounded border border-matrix-green/25 bg-matrix-bg/50 px-2 py-1"
                >
                  <span className="font-mono text-base tabular-nums text-matrix-green/90">
                    {pair}
                  </span>
                  {isReversed && (
                    <span className="font-thai text-[9px] text-matrix-cyan/70">
                      กลับ
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
