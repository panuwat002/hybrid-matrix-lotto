import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว — Hybrid Matrix",
  description:
    "ข้อมูลที่ระบบเก็บ (Vercel Analytics + Upstash counter) และไม่เก็บ ตามหลัก Thai PDPA",
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
        อัปเดตล่าสุด: 12 สิงหาคม 2569 · สอดคล้อง PDPA (พ.ร.บ.
        คุ้มครองข้อมูลส่วนบุคคล)
      </p>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          1. ข้อมูลที่เก็บ (functional)
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • <b>Cookie <code className="text-matrix-cyan">lotto_unlock</code></b>{" "}
            — HttpOnly, SameSite=Lax, อายุ 4 ชั่วโมง
            เก็บสถานะยอมรับข้อตกลง (functional cookie)
          </li>
          <li>
            • <b>IP address</b> — ใช้เฉพาะสำหรับ rate limiting (generateMatrix
            20 req/นาที, counter 5 req/นาที) เก็บใน memory ของ server
            เท่านั้น ไม่บันทึกลง log ถาวร
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          2. ข้อมูลที่เก็บผ่าน Vercel Analytics
        </h2>
        <p className="mb-3 font-thai text-sm leading-relaxed text-matrix-green/85">
          Vercel Analytics เก็บข้อมูลต่อการเยี่ยมชม (ไม่ใช้ cookie, ไม่ track
          cross-site):
        </p>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>• URL path ที่เยี่ยมชม (ไม่มี query string)</li>
          <li>• Referrer — เว็บที่นำมา</li>
          <li>
            • Country/City โดยประมาณ จาก IP → geoip แล้ว{" "}
            <b>IP ถูกทิ้งหลัง lookup</b> ไม่เก็บถาวร
          </li>
          <li>• Browser + OS จาก User-Agent</li>
          <li>
            • Custom events: ปุ่ม/action ที่ user ทำ (เช่น{" "}
            <code className="text-matrix-cyan">matrix_generated</code>,{" "}
            <code className="text-matrix-cyan">number_copied</code>,{" "}
            <code className="text-matrix-cyan">support_qr_open</code>)
          </li>
          <li>
            • ใน <code className="text-matrix-cyan">matrix_generated</code>{" "}
            เก็บ target date ที่ user ป้อน (input parameter ไม่ใช่ PII)
          </li>
        </ul>
        <p className="mt-3 font-thai text-xs text-matrix-cyan/70">
          Opt-out: เปิด DoNotTrack header ใน browser หรือใช้ ad blocker
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          2b. Public Visitor Counter (Upstash Redis)
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • Counter รวมของการเยี่ยมชมหน้าหลัก — เก็บแค่{" "}
            <b>integer เดียว</b> (จำนวนรวม)
          </li>
          <li>• ไม่เก็บ IP, ไม่เก็บ timestamp, ไม่เก็บ session id, ไม่ระบุตัวตน</li>
          <li>
            • นับสูงสุด 1 ครั้ง/browser session ผ่าน sessionStorage
          </li>
          <li>
            • Server-side rate limit 5 hits/นาที/IP ป้องกันการ spam counter
          </li>
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-matrix-cyan/30 bg-matrix-dim/40 p-5">
        <h2 className="mb-3 font-thai text-lg text-matrix-cyan">
          2c. ข้อมูลที่ไม่เก็บ
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>• ไม่มี user account / ไม่ต้องล็อกอิน</li>
          <li>• ไม่มี database ที่บันทึกประวัติการใช้งานราย user</li>
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
            • <b>Vercel</b> (hosting + analytics) — ได้ IP + User-Agent ตาม
            server log มาตรฐาน; Vercel Analytics ประมวลผลตามรายการใน section
            2 ด้านบน
          </li>
          <li>
            • <b>Upstash</b> (Redis storage for visitor counter, hosted in
            Singapore) — เก็บเฉพาะ integer counter ตามรายการใน section 2b
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
          ระบบไม่บันทึกข้อมูลส่วนบุคคลลง persistent storage รายบุคคล
          จึงไม่มี right-to-access หรือ right-to-delete ที่จะต้องประมวลผล
          ทางเลือกที่มี:
        </p>
        <ul className="mt-2 space-y-1 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • Opt-out จาก Vercel Analytics: เปิด{" "}
            <code className="text-matrix-cyan">DoNotTrack</code> ใน browser
            หรือใช้ ad blocker (uBlock Origin, AdGuard)
          </li>
          <li>• ล้าง counter session flag: clear browsing data ใน browser</li>
          <li>• ล้าง unlock cookie: clear browsing data ใน browser</li>
        </ul>
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
