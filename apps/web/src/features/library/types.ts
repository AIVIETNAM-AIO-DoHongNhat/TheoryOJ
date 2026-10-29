/** Kiểu dữ liệu của thư viện tài liệu. Dùng được ở cả client và server. */

export const DOC_KINDS = ["giao_trinh", "van_kien", "tham_khao", "cand", "so_lieu"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const KIND_LABELS: Record<DocKind, string> = {
  giao_trinh: "Giáo trình",
  van_kien: "Văn kiện",
  tham_khao: "Tài liệu tham khảo",
  cand: "Văn bản CAND",
  so_lieu: "Số liệu thống kê",
};

export type DocFormat = "pdf" | "md" | "docx";

export const FORMAT_LABELS: Record<DocFormat, string> = { pdf: "PDF", md: "Văn bản", docx: "Word" };

export interface DocChapter {
  number: number;
  title: string;
  /** Trang PDF đầu và cuối của chương, đếm từ 1. */
  from: number;
  to: number;
}

export interface LibraryDoc {
  slug: string;
  subject: string;
  /** Đường dẫn tính từ content/<môn>/, giống trường `document` của dịch vụ tìm kiếm. */
  file: string;
  title: string;
  kind: DocKind;
  format: DocFormat;
  publisher: string | null;
  /** Số trang PDF, nếu có. */
  pages: number | null;
  /** Trang in = trang PDF + pageOffset. */
  pageOffset: number;
  chapters: DocChapter[];
  relatedChapters: number[];
  sizeBytes: number;
}

/** "van-kien/14-NQ-68-NQ-TW-2025.md" → "nq-68-nq-tw-2025". Bỏ số thứ tự ở đầu tên file. */
export function slugOf(file: string): string {
  const base = file.split("/").pop()!.replace(/\.[^.]+$/, "");
  return base.replace(/^\d+[a-z]?-/i, "").toLowerCase().replace(/[_\s]+/g, "-");
}

/** Liên kết tới trình đọc, mở sẵn ở trang PDF nếu có. */
export function readerHref(file: string, pdfPage?: number | null): string {
  return `/thu-vien/${slugOf(file)}${pdfPage ? `?trang=${pdfPage}` : ""}`;
}

export function printedPage(doc: Pick<LibraryDoc, "pageOffset">, pdfPage: number): number {
  return pdfPage + doc.pageOffset;
}

export function formatSize(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

export function docMeta(d: LibraryDoc): string {
  return [d.publisher, d.pages ? `${d.pages.toLocaleString("vi-VN")} trang` : null, FORMAT_LABELS[d.format], formatSize(d.sizeBytes)]
    .filter(Boolean)
    .join(" · ");
}
