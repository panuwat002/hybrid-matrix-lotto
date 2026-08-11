import { CopyButton } from "./CopyButton";
import { TensionMeter } from "./TensionMeter";

type Props = {
  title: string;
  numbers: string[];
  tension: number;
};

export function ResultCard({ title, numbers, tension }: Props) {
  return (
    <article className="rounded-xl border border-matrix-green/30 bg-matrix-dim/70 p-5 shadow-[0_0_20px_-8px_#00ff9c]">
      <h3 className="font-thai text-sm text-matrix-cyan uppercase tracking-widest mb-3">
        {title}
      </h3>
      <ul className="space-y-2">
        {numbers.map((n, i) => (
          <li key={`${n}-${i}`} className="flex items-center justify-between">
            <span className="font-mono text-3xl text-matrix-green drop-shadow-[0_0_8px_#00ff9c]">
              {n}
            </span>
            <CopyButton text={n} />
          </li>
        ))}
      </ul>
      <TensionMeter score={tension} />
    </article>
  );
}
