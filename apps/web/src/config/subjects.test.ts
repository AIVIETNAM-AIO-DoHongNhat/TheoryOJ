import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { EXERCISES } from "@/domain/ktct/exercises";
import { getProfile } from "@/features/learning/server/profile";

import { ACTIVE_SUBJECTS } from "./subjects";

// Mở một môn chỉ cần nội dung và một mục trong subjects.ts (PLAN.md mục 8, giai đoạn 6, hướng dẫn ở content/THEM-MON.md).
// Kiểm thử này bắt các thiếu sót thường gặp trước khi môn hiện lên trang.
const CONTENT = path.resolve(__dirname, "../../../../content");
const EVAL = path.resolve(__dirname, "../../../../eval");

interface ManifestDoc { kind: string; chapters?: { number: number; title?: string }[] }

describe.each(ACTIVE_SUBJECTS.map((s) => [s.id, s] as const))("môn %s", (id, subject) => {
  const numbers = subject.chapters.map((c) => c.number);

  it("có chương, số chương liên tục từ 1", () => {
    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("manifest.yaml có giáo trình chia chương khớp với subjects.ts", () => {
    const file = path.join(CONTENT, id, "manifest.yaml");
    expect(fs.existsSync(file), `thiếu content/${id}/manifest.yaml`).toBe(true);
    const manifest = parse(fs.readFileSync(file, "utf8")) as { subject: string; documents: ManifestDoc[] };
    expect(manifest.subject).toBe(id);
    const textbook = manifest.documents.find((d) => d.kind === "giao_trinh" && d.chapters?.length);
    expect(textbook, "cần một tài liệu kind: giao_trinh có chapters").toBeDefined();
    expect(textbook!.chapters!.map((c) => c.number)).toEqual(numbers);
    for (const c of textbook!.chapters!) {
      if (c.title) expect(c.title, `tên chương ${c.number}`).toBe(subject.chapters.find((x) => x.number === c.number)!.title);
    }
  });

  it("tro-ly.yaml hợp lệ, câu gợi ý thuộc chế độ và chương của môn", () => {
    const profile = getProfile(id);
    expect(profile.suggestions.length).toBeGreaterThan(0);
    const all = [...profile.suggestions, ...Object.values(profile.chapterQuestions).flat()];
    for (const s of all) expect(subject.modes, s.text).toContain(s.mode);
    for (const n of Object.keys(profile.chapterQuestions).map(Number)) expect(numbers).toContain(n);
  });

  it("chế độ Giải bài tập chỉ bật khi môn có công cụ tính", () => {
    expect(subject.modes.includes("exercise")).toBe(!!EXERCISES[id]);
  });

  it("mỗi chương có ngân hàng trắc nghiệm", () => {
    for (const n of numbers) {
      expect(fs.existsSync(path.join(CONTENT, id, "question-bank", `chuong-${n}.yaml`)), `thiếu question-bank/chuong-${n}.yaml`).toBe(true);
    }
  });

  it("có bộ câu chuẩn eval/<môn>/golden.jsonl, gồm cả câu cần từ chối", () => {
    const file = path.join(EVAL, id, "golden.jsonl");
    expect(fs.existsSync(file), `thiếu eval/${id}/golden.jsonl`).toBe(true);
    const items = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(new Set(items.map((x) => x.id)).size).toBe(items.length);
    for (const x of items) expect(x.question && x.mode && x.expect, x.id).toBeTruthy();
    expect(items.some((x) => x.expect === "answer")).toBe(true);
    expect(items.some((x) => x.expect === "refuse")).toBe(true);
  });
});
