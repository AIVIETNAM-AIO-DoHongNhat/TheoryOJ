import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

// Kiểm tra mọi file câu tự luận và luận điệu phản bác theo quy ước trong content/<môn>/tu-luan/_mau.yaml
// và content/<môn>/phan-bac/_mau.yaml. Phần đọc file ở server/bank.ts kiểm tra cấu trúc lúc chạy; ở đây kiểm tra nội dung.
const ROOT = path.resolve(__dirname, "../../../../../content");

interface Point { id: string; y: string; diem: number; page?: number | null; document?: string | null }
interface Manifest { documents: { file: string; kind: string; page_offset?: number; chapters?: { number: number; pages: [number, number] }[] }[] }

function filesIn(folder: string) {
  return fs.readdirSync(ROOT).flatMap((subject) => {
    const dir = path.join(ROOT, subject, folder);
    return fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => /^chuong-\d+\.yaml$/.test(f)).map((f) => ({ subject, file: path.join(dir, f) }))
      : [];
  });
}

/** Trang in đầu và cuối của giáo trình, và danh sách tài liệu, đọc từ manifest của môn. */
function manifestOf(subject: string) {
  const m = parse(fs.readFileSync(path.join(ROOT, subject, "manifest.yaml"), "utf8")) as Manifest;
  const textbook = m.documents.find((d) => d.kind === "giao_trinh");
  const offset = textbook?.page_offset ?? 0;
  const pages = textbook?.chapters?.flatMap((c) => c.pages) ?? [];
  return {
    documents: new Set(m.documents.map((d) => d.file)),
    range: pages.length ? [Math.min(...pages) + offset, Math.max(...pages) + offset] : null,
  };
}

function checkRubric(subject: string, points: Point[]) {
  const { documents, range } = manifestOf(subject);
  expect(new Set(points.map((p) => p.id)).size).toBe(points.length);
  expect(points.reduce((s, p) => s + p.diem, 0)).toBe(10);
  for (const p of points) {
    expect(p.y.length).toBeGreaterThan(5);
    expect(p.page && p.document).toBeFalsy();
    if (p.page && range) {
      expect(p.page).toBeGreaterThanOrEqual(range[0]);
      expect(p.page).toBeLessThanOrEqual(range[1]);
    }
    if (p.document) expect(documents.has(p.document)).toBe(true);
  }
}

const essays = filesIn("tu-luan");
const rebuttals = filesIn("phan-bac");

describe.each(essays.map((e) => [path.relative(ROOT, e.file), e]))("%s", (_, { subject, file }) => {
  const bank = parse(fs.readFileSync(file, "utf8")) as { chapter: number; questions: { id: string; q: string; rubric: Point[] }[] };

  it("có ít nhất 2 câu, mã câu không trùng", () => {
    expect(bank.questions.length).toBeGreaterThanOrEqual(2);
    expect(new Set(bank.questions.map((q) => q.id)).size).toBe(bank.questions.length);
  });

  it.each(bank.questions.map((q) => [q.id, q]))("%s: barem tổng 10 điểm, trang và văn kiện hợp lệ", (_, q) => {
    checkRubric(subject, q.rubric);
  });
});

describe.each(rebuttals.map((e) => [path.relative(ROOT, e.file), e]))("%s", (_, { subject, file }) => {
  const bank = parse(fs.readFileSync(file, "utf8")) as {
    items: {
      id: string;
      luan_dieu: string;
      nguon_phan_bac: { ten: string; bao: string; url: string }[];
      ngay_bien: string[];
      rubric: Record<"ly_luan" | "van_kien" | "thuc_tien", Point[] | undefined>;
    }[];
  };

  it("mã luận điệu không trùng", () => {
    expect(new Set(bank.items.map((i) => i.id)).size).toBe(bank.items.length);
  });

  it.each(bank.items.map((i) => [i.id, i]))("%s: có bài phản bác đã công bố, có lỗi lập luận, barem hợp lệ", (_, item) => {
    expect(item.nguon_phan_bac.length).toBeGreaterThanOrEqual(1);
    for (const s of item.nguon_phan_bac) expect(s.url).toMatch(/^https:\/\//);
    expect(item.ngay_bien.length).toBeGreaterThanOrEqual(1);
    expect(item.rubric.ly_luan?.length).toBeGreaterThanOrEqual(1);
    checkRubric(subject, [...(item.rubric.ly_luan ?? []), ...(item.rubric.van_kien ?? []), ...(item.rubric.thuc_tien ?? [])]);
  });
});
