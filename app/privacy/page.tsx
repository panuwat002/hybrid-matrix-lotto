import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — Hybrid Matrix",
  description: "ข้อมูลที่ระบบเก็บและไม่เก็บ ตามหลัก Thai PDPA",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6 md:p-12">
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="font-thai text-sm text-matrix-cyan/80 transition hover:text-matrix-cyan"
        >
          ← หน้าหลัก
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-matrix-cyan/60">
          Hybrid Matrix
        </span>
      </nav>

      <h1 className="mb-2 font-mono text-3xl text-matrix-green drop-shadow-[0_0_10px_#00ff9c] md:text-4xl">
        นโยบายความเป็นส่วนตัว
      </h1>
      <p className="mb-10 font-thai text-sm text-matrix-cyan/80">
        อัปเดตล่าสุด: 11 สิงหาคม 2569 · สอดคล้อง PDPA (พ.ร.บ.
        คุ้มครองข้อมูลส่วนบุคคล)
      </p>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          1. ข้อมูลที่เก็บ
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • <b>Cookie <code className="text-matrix-cyan">lotto_unlock</code></b>{" "}
            — HttpOnly, SameSite=Lax, อายุ 4 ชั่วโมง
            เก็บสถานะยอมรับข้อตกลง (functional cookie)
          </li>
          <li>
            • <b>IP address</b> — ใช้เฉพาะสำหรับ rate limiting (20 req/นาที)
            เก็บใน memory ของ server เท่านั้น ไม่บันทึกลง log ถาวร
          </li>
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-matrix-cyan/30 bg-matrix-dim/40 p-5">
        <h2 className="mb-3 font-thai text-lg text-matrix-cyan">
          2. ข้อมูลที่ไม่เก็บ
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>• ไม่มี Google Analytics / ไม่มี tracking pixel</li>
          <li>• ไม่มี user account / ไม่ต้องล็อกอิน</li>
          <li>• ไม่มี database ที่บันทึกการใช้งาน</li>
          <li>
            • ไฟล์สลิปที่อัปโหลด (mockup UI) —{" "}
            <b>ไม่ถูกส่งไปที่ server ใดๆ</b> อยู่ในหน้าจอเบราว์เซอร์เท่านั้น
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          3. Third-Party Services
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • <b>Vercel</b> (hosting) — ได้ IP + User-Agent ตาม server log
            มาตรฐาน (ตาม Vercel Privacy Policy)
          </li>
          <li>
            • <b>Fonts</b> — self-hosted ผ่าน{" "}
            <code className="text-matrix-cyan">next/font</code> ในเวลา build
            ไม่ fetch จาก Google runtime → เบราว์เซอร์ user ไม่ติดต่อ Google
            โดยตรง
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          4. สิทธิ์ของคุณ (PDPA)
        </h2>
        <p className="font-thai text-sm leading-relaxed text-matrix-green/85">
          เนื่องจากระบบไม่บันทึกข้อมูลส่วนบุคคลลง persistent storage
          จึงไม่มีสิ่งที่ให้เข้าถึง แก้ไข หรือลบได้ ถ้าต้องการล้าง cookie
          กด clear browsing data ในเบราว์เซอร์
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          5. ติดต่อ
        </h2>
        <p className="font-thai text-sm leading-relaxed text-matrix-green/85">
          รายงานปัญหาความปลอดภัยหรือ privacy: ดูข้อมูลใน{" "}
          <code className="text-matrix-cyan">/.well-known/security.txt</code>
        </p>
      </section>

      <section className="border-t border-matrix-cyan/20 pt-6">
        <p className="font-thai text-xs text-matrix-green/60">
          เอกสารนี้เขียนโดยผู้พัฒนา ไม่ใช่ที่ปรึกษากฎหมาย —
          กรณีต้องการความมั่นใจทางกฎหมายเต็มรูปแบบ ควรปรึกษาผู้เชี่ยวชาญ PDPA
        </p>
      </section>
    </main>
  );
}
