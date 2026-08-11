import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "เกี่ยวกับสูตร — Hybrid Matrix",
  description:
    "อธิบายอย่างซื่อสัตย์ว่า Hybrid Matrix Algorithm ทำอะไร ไม่ทำอะไร และตัดสินใจการออกแบบด้วยเหตุผลไหน",
};

export default function AboutPage() {
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
        เกี่ยวกับสูตร
      </h1>
      <p className="mb-10 font-thai text-sm text-matrix-cyan/80">
        เอกสารความซื่อสัตย์ — ว่าระบบนี้คืออะไร และไม่ใช่อะไร
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          ระบบนี้ทำอะไร
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • คำนวณชุดตัวเลข 6 หลัก + เลขข้างเคียง + หน้า 3 + ท้าย 3 + ท้าย 2
            จาก <b>วันที่เป้าหมาย</b> และ <b>สถิติผลย้อนหลัง 240 งวด</b>
          </li>
          <li>
            • ผลลัพธ์ <b>deterministic 100%</b> — input เดียวกัน = output
            เดียวกันเสมอ ทุกเครื่อง ทุกเวลา
          </li>
          <li>
            • ใช้ค่าคงที่ทางคณิตศาสตร์ (Golden Ratio φ, Pi π, Euler&apos;s e)
            + operations ที่ตรวจสอบได้ (คูณ, mod, √, ∛)
          </li>
          <li>
            • คำนวณด้วย <code className="text-matrix-cyan">decimal.js</code>{" "}
            ที่ precision 50 หลัก → ไม่มี floating-point error
          </li>
        </ul>
      </section>

      <section className="mb-10 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="mb-3 font-thai text-lg text-red-300">
          ระบบนี้ไม่ได้ทำอะไร
        </h2>
        <ul className="space-y-2 font-thai text-sm leading-relaxed text-matrix-green/85">
          <li>
            • <b>ไม่ทำนายผลรางวัลในอนาคต</b> — ตามหลัก information theory
            output ที่ได้เป็น function ของ input ที่มีอยู่ ณ ปัจจุบันเท่านั้น
            (สถิติเก่า + วันที่) ผลรางวัลจริงในอนาคตไม่ได้อยู่ใน input
          </li>
          <li>
            • <b>ไม่รับประกันผลใดๆ</b> — ตัวเลขที่ออกเป็น pattern
            ที่คำนวณได้แน่นอน ไม่ใช่ prediction ทางสถิติ
          </li>
          <li>
            • <b>ไม่ใช่ AI/ML</b> — เป็น pure mathematical function ไม่มี model
            training ไม่มีการเรียนรู้จาก data
          </li>
          <li>
            • <b>ไม่ใช่ระบบเสี่ยงโชค</b> — ผลลัพธ์ deterministic ไม่มี randomness
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">สูตรโดยย่อ</h2>
        <div className="space-y-3 rounded-lg border border-matrix-cyan/20 bg-matrix-dim/50 p-5 font-mono text-xs leading-relaxed text-matrix-green/85">
          <div>
            <span className="text-matrix-cyan">Phase 1:</span> S_T = concat(top3
            digits by (freq-mean)² × (gap+1)) / 1000
          </div>
          <div>
            <span className="text-matrix-cyan">Phase 2:</span> X = D × S_T × φ³
            × π
          </div>
          <div>
            <span className="text-matrix-cyan">Phase 3:</span>{" "}
            Prize1=⌊X·π⌋ mod 10⁶ · Back2=⌊X⌋ mod 100 · Front3a=⌊X·10¹⁵⌋ mod 10³
            · Front3b=⌊X·e⌋ mod 10³ · Back3a=⌊√X⌋ mod 10³ · Back3b=⌊∛X⌋ mod 10³
          </div>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-matrix-cyan/25 bg-matrix-dim/40 p-5">
        <h2 className="mb-4 font-thai text-lg text-matrix-cyan">
          บันทึกความซื่อสัตย์ (Honest Notes)
        </h2>
        <p className="mb-4 font-thai text-xs text-matrix-green/70">
          สูตรผ่านการตรวจสอบเชิง peer review 3 มุมมอง — บันทึกข้อจำกัดไว้:
        </p>
        <dl className="space-y-4 font-thai text-sm">
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              &ldquo;Statistical Tension&rdquo; เป็น heuristic
            </dt>
            <dd className="text-matrix-green/75">
              ไม่ใช่ physical property ที่มี theorem รองรับ — เลือกใช้ชื่อนี้เพราะ
              intuitive แต่จริงๆ คือ composite score: variance × gap
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              การเลือก φ³, π, e เป็น aesthetic choice
            </dt>
            <dd className="text-matrix-green/75">
              ไม่ใช่ derivation จาก first principles — เลือกเพราะเป็น
              irrational transcendental constants ให้ number distribution
              ที่กระจายดี ค่าคงที่อื่นก็ใช้ได้ (เช่น √2, ln2)
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              Tie-break rule (digit ascending)
            </dt>
            <dd className="text-matrix-green/75">
              เป็น convention เพื่อให้ deterministic
              ไม่ใช่ property ทางสถิติที่มี justification เชิงคณิตศาสตร์
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              Cube root ใช้ pow(1/3)
            </dt>
            <dd className="text-matrix-green/75">
              เป็น approximation ที่ precision 50 ผ่าน exp/ln internally
              ของ decimal.js — ไม่ใช่ ∛ ทางคณิตศาสตร์ที่ exact แต่ deterministic
              ทุกครั้ง
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              Precision 50 vs Native double (~15 หลัก)
            </dt>
            <dd className="text-matrix-green/75">
              เลือก 50 เพื่อความมั่นใจว่าไม่มี floating-point rounding
              ใน operation ใดๆ ใช้ native double ก็ให้ผลใกล้เคียงในกรณีส่วนใหญ่
              — precision 50 คือ over-engineering ที่ปลอดภัย
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-10 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="mb-4 font-thai text-lg text-red-300">
          บันทึกด้านความปลอดภัย (Security Notes)
        </h2>
        <dl className="space-y-4 font-thai text-sm">
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              Cookie ไม่ใช่ระบบยืนยันตัวตน
            </dt>
            <dd className="text-matrix-green/75">
              <code className="text-matrix-cyan">lotto_unlock</code>{" "}
              เป็น functional cookie แสดงว่าคุณยอมรับ disclaimer
              ไม่ได้เป็น authentication — ใครก็ตั้งเองใน DevTools ได้
              เป็น speed bump ไม่ใช่กำแพง
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              ตัวเลข deterministic = enumerable
            </dt>
            <dd className="text-matrix-green/75">
              เนื่องจากสูตรให้ผลลัพธ์เดียวกันเสมอสำหรับ input เดียวกัน
              ใครก็คำนวณล่วงหน้าทุกวันที่ที่เป็นไปได้เก็บเป็น static table
              ไม่มี &ldquo;secret&rdquo; ในระบบ — คุณสมบัตินี้เป็นไปตาม design
              (transparency)
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-semibold text-matrix-green">
              การอัปโหลดสลิป (mockup)
            </dt>
            <dd className="text-matrix-green/75">
              หน้าอัปโหลดสลิปในเวอร์ชัน MVP <b>ไม่มีการประมวลผลจริง</b>{" "}
              — ไฟล์ที่คุณเลือกอยู่ในหน้าจอเบราว์เซอร์เท่านั้น
              ไม่ถูกส่งไปที่ server หรือ third-party ใดๆ
            </dd>
          </div>
        </dl>
        <p className="mt-4 font-thai text-xs text-matrix-cyan/70">
          ดู{" "}
          <Link href="/privacy" className="underline hover:text-matrix-cyan">
            นโยบายความเป็นส่วนตัว
          </Link>{" "}
          สำหรับรายละเอียดข้อมูลที่เก็บและไม่เก็บ
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-thai text-lg text-matrix-green">
          Reproducibility Guarantee
        </h2>
        <p className="font-thai text-sm text-matrix-green/85">
          <b>Golden Snapshot Tests</b> ล็อกผลลัพธ์สำหรับ 5 target dates ไว้ใน
          git repository — ถ้ามีการ refactor engine แล้วผลลัพธ์เปลี่ยน CI
          จะฟ้องทันที ผลลัพธ์เหล่านั้นเป็น <i>reproducibility contract</i>{" "}
          ระหว่างเวอร์ชันของโปรเจกต์
        </p>
      </section>

      <section className="mb-4 border-t border-matrix-cyan/20 pt-6">
        <p className="font-thai text-xs text-matrix-green/60">
          Design spec ฉบับเต็ม:{" "}
          <code className="text-matrix-cyan">
            docs/superpowers/specs/2026-08-11-hybrid-matrix-lotto-design.md
          </code>
        </p>
      </section>
    </main>
  );
}
