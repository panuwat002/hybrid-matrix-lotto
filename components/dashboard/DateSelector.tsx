"use client";

import { formatThaiDate } from "@/lib/format";

type Props = {
  value: string; // "DDMMYYYY" BE
  onChange: (v: string) => void;
};

// convert BE "DDMMYYYY" → ISO "YYYY-MM-DD" AD (for <input type="date">)
function beToIso(be: string): string {
  if (!/^\d{8}$/.test(be)) return "";
  const dd = be.slice(0, 2);
  const mm = be.slice(2, 4);
  const yyyyBe = Number(be.slice(4, 8));
  const yyyyAd = yyyyBe - 543;
  return `${yyyyAd.toString().padStart(4, "0")}-${mm}-${dd}`;
}

function isoToBe(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  const yBe = Number(y) + 543;
  return `${d}${m}${yBe.toString().padStart(4, "0")}`;
}

export function DateSelector({ value, onChange }: Props) {
  return (
    <label className="block">
      <span className="font-thai text-sm text-matrix-cyan mb-2 block">
        เลือกวันงวด (พ.ศ.)
      </span>
      <input
        type="date"
        value={beToIso(value)}
        onChange={(e) => onChange(isoToBe(e.target.value))}
        className="w-full rounded-lg bg-matrix-dim border border-matrix-cyan/40 px-4 py-3 font-mono text-matrix-green focus:border-matrix-cyan focus:outline-none"
      />
      <span className="font-thai text-xs text-matrix-green/70 mt-1 block">
        งวด: {value ? formatThaiDate(value) : "ยังไม่ได้เลือก"}
      </span>
    </label>
  );
}
