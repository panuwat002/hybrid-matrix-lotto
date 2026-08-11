import { CopyButton } from "./CopyButton";
import { groupDigits } from "@/lib/format";

type Props = {
  title: string;
  numbers: string[];
};

export function ResultCard({ title, numbers }: Props) {
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
            <CopyButton text={n} />
          </li>
        ))}
      </ul>
    </article>
  );
}
