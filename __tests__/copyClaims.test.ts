import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Claims the site must not make, because its own backtest does not support
 * them. Matched as phrases, not words: the about page legitimately says
 * "ไม่ทำนายผลรางวัลในอนาคต", and a bare word list would flag that.
 */
const BANNED = [
  "เพิ่มโอกาส",
  "แม่นยำสูง",
  "การันตี",
  "ถูกแน่",
  "พลังแห่งค่าคงที่",
];

const ROOTS = ["app", "components", "lib"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("site copy makes no claim the backtest cannot support", () => {
  const files = ROOTS.flatMap(sourceFiles);

  it("scans every source file under app, components and lib", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const phrase of BANNED) {
    it(`never says "${phrase}"`, () => {
      const offenders = files.filter((f) =>
        readFileSync(f, "utf8").includes(phrase),
      );
      expect(offenders).toEqual([]);
    });
  }
});
