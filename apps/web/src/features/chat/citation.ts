import type { Citation } from "./types";

/** Vị trí trích dẫn: chương và trang in với giáo trình, tiêu đề mục với văn kiện. */
export function locator(c: Pick<Citation, "chapter" | "page" | "section">): string {
  const parts: string[] = [];
  if (c.chapter) parts.push(`chương ${c.chapter}`);
  if (c.page) parts.push(`tr. ${c.page}`);
  else if (c.section) parts.push(c.section);
  return parts.join(", ");
}
