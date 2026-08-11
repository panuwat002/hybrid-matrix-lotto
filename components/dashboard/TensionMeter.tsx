type Props = { score: number };

export function TensionMeter({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] font-mono text-matrix-cyan/70 mb-1">
        <span>TENSION</span>
        <span>{clamped.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 rounded bg-matrix-dim overflow-hidden">
        <div
          className="h-full bg-matrix-cyan shadow-[0_0_8px_#00d4ff]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
