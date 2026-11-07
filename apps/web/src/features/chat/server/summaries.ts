import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { CONTENT_ROOT } from "@/features/library/server/catalog";
import { slugOf } from "@/features/library/types";

// Tóm tắt sinh sẵn bằng `npm run tom-tat`, giảng viên soát rồi đổi status thành da-duyet.
// Mỗi chương một file content/<môn>/tom-tat/chuong-<n>.yaml; mỗi văn kiện một file tai-lieu-<slug>.yaml.
// Quy ước ở content/ktct/tom-tat/_mau.yaml.

const PartSchema = z.object({
  title: z.string().min(1),
  /** Trang PDF đầu và cuối của phần (tài liệu PDF). */
  pdf_pages: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
  /** Tiêu đề mục (văn kiện MD, DOCX). */
  section: z.string().optional(),
  summary: z.string().min(1),
});

export const SummaryFileSchema = z
  .object({
    subject: z.string().min(1),
    chapter: z.number().int().positive().optional(),
    document: z.string().min(1).optional(),
    status: z.enum(["nhap", "da-duyet"]),
    model: z.string().optional(),
    generated_at: z.string().optional(),
    overview: z.string().min(1),
    parts: z.array(PartSchema).min(1),
  })
  .refine((s) => (s.chapter === undefined) !== (s.document === undefined), "Cần đúng một trong hai trường chapter hoặc document");

export type SummaryFile = z.infer<typeof SummaryFileSchema>;
export type SummaryPart = z.infer<typeof PartSchema>;

export function summaryDir(subject: string): string {
  return path.join(CONTENT_ROOT, subject, "tom-tat");
}

export function chapterSummaryPath(subject: string, chapter: number): string {
  return path.join(summaryDir(subject), `chuong-${chapter}.yaml`);
}

export function documentSummaryPath(subject: string, document: string): string {
  return path.join(summaryDir(subject), `tai-lieu-${slugOf(document)}.yaml`);
}

const cache = new Map<string, SummaryFile | null>();

function load(file: string): SummaryFile | null {
  if (process.env.NODE_ENV === "production" && cache.has(file)) return cache.get(file)!;
  let result: SummaryFile | null = null;
  if (fs.existsSync(file)) {
    const parsed = SummaryFileSchema.safeParse(parse(fs.readFileSync(file, "utf8")));
    // File sai cấu trúc thì bỏ qua (trợ lý tóm tắt tại chỗ) và ghi log để giảng viên sửa.
    if (parsed.success) result = parsed.data;
    else console.error(`${path.relative(CONTENT_ROOT, file)}: ${z.prettifyError(parsed.error)}`);
  }
  cache.set(file, result);
  return result;
}

export function getChapterSummary(subject: string, chapter: number): SummaryFile | null {
  return load(chapterSummaryPath(subject, chapter));
}

export function getDocumentSummary(subject: string, document: string): SummaryFile | null {
  return load(documentSummaryPath(subject, document));
}
