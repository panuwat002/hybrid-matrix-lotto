import { CopyButton } from "./CopyButton";

type Props = {
  firstPrize: string;
  adjacent: [string, string];
};

export function FeaturedPrize({ firstPrize, adjacent }: Props) {
  return (
    <article className="relative overflow-hidden rounded-2xl border-2 border-matrix-green/50 bg-gradient-to-br from-matrix-dim/80 to-matrix-bg p-6 md:p-8 shadow-[0_0_60px_-15px_#00ff9c]">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 right-2 select-none font-mono text-[9rem] leading-none text-matrix-green/[0.04] md:text-[13rem]"
      >
        01
      </span>

      <h3 className="font-thai text-xs uppercase tracking-[0.35em] text-matrix-cyan">
        รางวัลที่ 1
      </h3>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <span className="font-mono text-6xl tabular-nums text-matrix-green drop-shadow-[0_0_18px_#00ff9c] md:text-7xl">
          {firstPrize}
        </span>
        <CopyButton text={firstPrize} />
      </div>

      <div className="mt-6 border-t border-matrix-cyan/20 pt-4">
        <h4 className="mb-3 font-thai text-[11px] uppercase tracking-[0.25em] text-matrix-cyan/70">
          ข้างเคียงรางวัลที่ 1
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {adjacent.map((n, i) => (
            <div
              key={`${n}-${i}`}
              className="flex items-center justify-between rounded-lg bg-matrix-bg/40 px-4 py-2"
            >
              <span className="font-mono text-2xl tabular-nums text-matrix-green/90">
                {n}
              </span>
              <CopyButton text={n} />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
