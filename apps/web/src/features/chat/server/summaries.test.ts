import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { getLibrary } from "@/features/library/server/catalog";

import { chapterSummaryPath, documentSummaryPath, SummaryFileSchema, summaryDir } from "./summaries";

// Bản tóm tắt sinh sẵn do giảng viên sửa tay: kiểm tra cấu trúc và tên file khớp với nội dung.
describe.each(ACTIVE_SUBJECTS.map((s) => [s.id, s] as const))("tom-tat của %s", (id, subject) => {
  const dir = summaryDir(id);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".yaml") && !f.startsWith("_")) : [];

  it.skipIf(files.length === 0).each(files)("%s đúng cấu trúc và đúng tên file", (name) => {
    const parsed = SummaryFileSchema.safeParse(parse(fs.readFileSync(path.join(dir, name), "utf8")));
    expect(parsed.success, parsed.success ? "" : z.prettifyError(parsed.error)).toBe(true);
    const data = parsed.data!;
    expect(data.subject).toBe(id);
    if (data.chapter !== undefined) {
      expect(subject.chapters.some((c) => c.number === data.chapter), `không có chương ${data.chapter}`).toBe(true);
      expect(path.basename(chapterSummaryPath(id, data.chapter))).toBe(name);
    } else {
      expect(getLibrary().some((d) => d.subject === id && d.file === data.document), `${data.document} không có trong manifest`).toBe(true);
      expect(path.basename(documentSummaryPath(id, data.document!))).toBe(name);
    }
  });
});
