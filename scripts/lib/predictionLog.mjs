/**
 * Guards and ordering for the prediction log.
 *
 * The log is the site's track record, so the only thing that protects it is
 * refusing to write a row that could have been informed by the result. Both
 * guards below exist for that reason, not for tidiness.
 */

const DATE_RE = /^\d{8}$/;

/** "16082569" (DDMMYYYY BE) → 25690816, so entries sort chronologically. */
export function sortKey(date) {
  if (!DATE_RE.test(date)) return 0;
  return Number(`${date.slice(4, 8)}${date.slice(2, 4)}${date.slice(0, 2)}`);
}

export function assertRecordable(date, publishedDraws, recordedEntries) {
  if (!DATE_RE.test(date)) {
    throw new Error(
      `วันงวด '${date}' ผิดรูปแบบ ต้องเป็น DDMMYYYY พ.ศ. 8 หลัก เช่น 01102569`,
    );
  }

  if (publishedDraws.some((d) => d.date === date)) {
    throw new Error(
      `งวด ${date} ออกผลแล้ว บันทึกย้อนหลังไม่ได้ — ถ้าบันทึกได้ ตัวเลขในหน้าย้อนดูก็ไม่มีความหมาย`,
    );
  }

  if (recordedEntries.some((e) => e.date === date)) {
    throw new Error(
      `งวด ${date} บันทึกไว้แล้ว เขียนทับไม่ได้ — ถ้าจะแก้จริงต้องแก้ไฟล์เองและอธิบายใน commit`,
    );
  }
}

export function appendPrediction(recordedEntries, entry) {
  return [...recordedEntries, entry].sort(
    (a, b) => sortKey(a.date) - sortKey(b.date),
  );
}
