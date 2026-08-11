/**
 * Shared display formatting helpers.
 * Never import from lib/engine — this file is safe for client components.
 */

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** "16082569" → "16 ส.ค. 2569"; returns the input unchanged if the format is invalid. */
export function formatThaiDate(be: string): string {
  if (!/^\d{8}$/.test(be)) return be;
  const day = Number(be.slice(0, 2));
  const monthIdx = Number(be.slice(2, 4)) - 1;
  const yearBe = be.slice(4, 8);
  const monthName = THAI_MONTHS_SHORT[monthIdx] ?? be.slice(2, 4);
  return `${day} ${monthName} ${yearBe}`;
}

/**
 * Insert a thin space every 3 digits from the right for readability.
 * "048139" → "048 139".  Copy value should still use the raw string.
 */
export function groupDigits(digits: string): string {
  if (digits.length <= 3) return digits;
  const out: string[] = [];
  const chars = digits.split("").reverse();
  for (let i = 0; i < chars.length; i++) {
    if (i > 0 && i % 3 === 0) out.push(" ");
    out.push(chars[i]);
  }
  return out.reverse().join("");
}
