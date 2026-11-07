import type { Subject } from "@/config/subjects";
import type { Hit } from "@/lib/rag-client";

import { locator } from "../citation";
import type { Citation } from "../types";

/** Tên ngắn để hiện trên thẻ trích dẫn, ví dụ "Giáo trình KTCT" hay "Nghị quyết 68-NQ/TW (2025)". */
export function shortTitle(hit: Pick<Hit, "kind" | "document_title">, subject: Pick<Subject, "shortName">): string {
  if (hit.kind === "giao_trinh") return `Giáo trình ${subject.shortName}`;
  return hit.document_title.replace(/\s+(về|dành cho)\s.*$/i, "");
}

export function toCitations(hits: Hit[], subject: Pick<Subject, "shortName">): Citation[] {
  return hits.map((h, i) => ({
    n: i + 1,
    title: shortTitle(h, subject),
    document: h.document,
    kind: h.kind,
    chapter: h.chapter,
    page: h.page,
    pdfPage: h.pdf_page,
    section: h.section,
    text: h.text,
    score: h.score,
  }));
}

// Đoạn tài liệu, câu hỏi và bài làm là dữ liệu không tin cậy: bỏ thẻ phân tách giả để không thoát được khỏi khối.
// Các thẻ bai_lam, barem, de_bai, luan_dieu, loi_lap_luan dùng ở lõi chấm câu hỏi mở (features/open-answer).
export function sanitize(text: string): string {
  return text.replace(/<\/?\s*(tai_lieu|cau_hoi|bai_lam|barem|de_bai|luan_dieu|loi_lap_luan)[^>]*>/gi, "");
}

export function buildContext(citations: Citation[]): string {
  return citations
    .map((c) => {
      const source = [c.title, locator(c)].filter(Boolean).join(", ");
      return `<tai_lieu so="${c.n}" nguon="${source.replaceAll('"', "'")}">\n${sanitize(c.text)}\n</tai_lieu>`;
    })
    .join("\n\n");
}

export function buildUserMessage(citations: Citation[], question: string): string {
  return `${buildContext(citations)}\n\n<cau_hoi>\n${sanitize(question)}\n</cau_hoi>`;
}
