import type { Hit } from "@/lib/rag-client";

import { locator } from "../citation";
import type { Citation } from "../types";

const SHORT_TITLES: Record<string, string> = {
  giao_trinh: "Giáo trình KTCT",
};

/** Tên ngắn để hiện trên thẻ trích dẫn, ví dụ "Giáo trình KTCT" hay "Nghị quyết 68-NQ/TW (2025)". */
export function shortTitle(hit: Pick<Hit, "kind" | "document_title">): string {
  return SHORT_TITLES[hit.kind] ?? hit.document_title.replace(/\s+(về|dành cho)\s.*$/i, "");
}

export function toCitations(hits: Hit[]): Citation[] {
  return hits.map((h, i) => ({
    n: i + 1,
    title: shortTitle(h),
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

// Đoạn tài liệu và câu hỏi là dữ liệu không tin cậy: bỏ thẻ phân tách giả để không thoát được khỏi khối.
export function sanitize(text: string): string {
  return text.replace(/<\/?\s*(tai_lieu|cau_hoi)[^>]*>/gi, "");
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
