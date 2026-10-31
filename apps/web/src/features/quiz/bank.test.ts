import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

// Kiểm tra mọi file ngân hàng câu hỏi theo quy ước trong content/<môn>/question-bank/_mau.yaml.
const ROOT = path.resolve(__dirname, "../../../../../content");
const files = fs
  .readdirSync(ROOT)
  .flatMap((subject) => {
    const dir = path.join(ROOT, subject, "question-bank");
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^chuong-\d+\.yaml$/.test(f)).map((f) => path.join(dir, f)) : [];
  });

interface Q { id: string; q: string; options: unknown[]; answer: string; explain: string; page?: number }

describe.each(files.map((f) => [path.relative(ROOT, f), f]))("%s", (_, file) => {
  const bank = parse(fs.readFileSync(file, "utf8")) as { chapter: number; questions: Q[] };

  it("có ít nhất 20 câu, mã câu không trùng", () => {
    expect(bank.questions.length).toBeGreaterThanOrEqual(20);
    expect(new Set(bank.questions.map((q) => q.id)).size).toBe(bank.questions.length);
  });

  it.each(bank.questions.map((q) => [q.id, q]))("%s hợp lệ", (_, q) => {
    expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect("ABCDEF".indexOf(q.answer)).toBeLessThan(q.options.length);
    expect(new Set(q.options.map(String)).size).toBe(q.options.length);
    // Phương án được trộn khi hiển thị, nên giải thích và phương án không được dựa vào chữ cái.
    expect(q.explain).not.toMatch(/[Pp]hương án [A-F](?![\p{L}.])|(?<!\p{L})[A-F], [A-F](?![\p{L}.])|ở [A-F](?![\p{L}.])/u);
    expect(q.options.map(String).join(" ")).not.toMatch(/cả [A-F] và [A-F]|tất cả (đều|các phương án)/i);
  });
});
