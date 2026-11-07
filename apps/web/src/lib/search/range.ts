import "server-only";

import { type SQL, sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { Kind } from "./types";

/** Một đoạn của chỉ mục, kèm thứ tự trong tài liệu. */
export type RangeChunk = {
  text: string;
  document: string;
  document_title: string;
  kind: string;
  chapter: number | null;
  page: number | null;
  pdf_page: number | null;
  section: string | null;
  ord: number;
};

export interface RangeRequest {
  subject: string;
  /** Đường dẫn tài liệu trong chỉ mục, ví dụ "van-kien/14-NQ-68-NQ-TW-2025.md". */
  documents?: string[];
  kinds?: Kind[];
  chapters?: number[];
  /** Khoảng trang in, gồm cả hai đầu. */
  pages?: [number, number];
}

/**
 * Lấy nguyên văn các đoạn trong một phạm vi (chương, khoảng trang, một tài liệu), theo đúng thứ tự trong tài liệu.
 * Dùng cho tóm tắt: khác tìm kiếm, ở đây cần đủ nội dung chứ không cần đoạn gần nhất với câu hỏi.
 * Đọc thẳng bảng chunks nên chạy được cả khi có và không có services/rag.
 */
export async function fetchRange(req: RangeRequest): Promise<RangeChunk[]> {
  const parts: SQL[] = [sql`c.subject = ${req.subject}`];
  if (req.documents?.length) parts.push(sql`d.path IN (${sql.join(req.documents.map((p) => sql`${p}`), sql`, `)})`);
  if (req.kinds?.length) parts.push(sql`c.kind IN (${sql.join(req.kinds.map((k) => sql`${k}`), sql`, `)})`);
  if (req.chapters?.length) parts.push(sql`c.chapter IN (${sql.join(req.chapters.map((n) => sql`${Math.trunc(n)}`), sql`, `)})`);
  if (req.pages) parts.push(sql`c.page BETWEEN ${Math.trunc(req.pages[0])} AND ${Math.trunc(req.pages[1])}`);
  return [
    ...(await db.execute<RangeChunk>(sql`
      SELECT c.text, d.path AS document, d.title AS document_title, c.kind, c.chapter, c.page, c.pdf_page, c.section, c.ord
      FROM chunks c JOIN documents d ON d.id = c.document_id
      WHERE ${sql.join(parts, sql` AND `)}
      ORDER BY d.path, c.ord`)),
  ];
}
