import type { RangeChunk } from "@/lib/search/range";

// Phần thuần của tóm tắt (không gọi DB hay mô hình), tách riêng để kiểm thử.

export interface Group {
  key: string;
  chunks: RangeChunk[];
}

/** Mục cấp một của đường dẫn mục "I- QUAN ĐIỂM › 1. ...". */
export const topSection = (section: string | null) => section?.split(" › ")[0]?.trim() || null;

/**
 * Gom các đoạn liền nhau thành nhóm để trích dẫn: theo trang PDF với tài liệu trích theo trang (giáo trình),
 * theo mục cấp một với văn kiện. Mỗi nhóm thành một khối <tai_lieu>, thẻ trích dẫn mở đúng trang hoặc mục.
 */
export function groupChunks(chunks: RangeChunk[]): Group[] {
  const groups: Group[] = [];
  for (const c of chunks) {
    const key = `${c.document}#${c.pdf_page != null ? `p${c.pdf_page}` : (topSection(c.section) ?? "mo-dau")}`;
    const last = groups.at(-1);
    if (last?.key === key) last.chunks.push(c);
    else groups.push({ key, chunks: [c] });
  }
  return groups;
}

export const groupChars = (g: Group) => g.chunks.reduce((n, c) => n + c.text.length, 0);

/** Chia các nhóm thành lô không quá `limit` ký tự (trừ nhóm đơn lẻ đã dài hơn), giữ thứ tự. */
export function batchGroups(groups: Group[], limit: number): Group[][] {
  const batches: Group[][] = [];
  let current: Group[] = [];
  let size = 0;
  for (const g of groups) {
    const n = groupChars(g);
    if (current.length && size + n > limit) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(g);
    size += n;
  }
  if (current.length) batches.push(current);
  return batches;
}

/** Nhãn của một lô đã tóm lược, ví dụ "Tóm lược tr. 52–58". */
export function rangeLabel(batch: Group[]): string {
  const pages = batch.flatMap((g) => g.chunks.map((c) => c.page)).filter((p): p is number => p != null);
  if (pages.length) {
    const from = Math.min(...pages);
    const to = Math.max(...pages);
    return from === to ? `Tóm lược tr. ${from}` : `Tóm lược tr. ${from}–${to}`;
  }
  const sections = [...new Set(batch.map((g) => topSection(g.chunks[0].section)).filter(Boolean))];
  return sections.length ? `Tóm lược: ${sections.slice(0, 2).join("; ")}${sections.length > 2 ? "…" : ""}` : "Tóm lược";
}
