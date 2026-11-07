export const CITE_PREFIX = "#cite-";

/**
 * Chuẩn hóa đầu ra của mô hình trước khi render:
 * - \( \) và \[ \] thành $ $ và $$ $$ để remark-math nhận.
 * - [n] thành liên kết #cite-n để thay bằng thẻ trích dẫn.
 */
export function normalize(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`)
    .replace(/(?<!\\)\[(\d{1,2}(?:\s*[,;]\s*\d{1,2})*)\](?!\()/g, (_, list: string) =>
      list.split(/\s*[,;]\s*/).map((n) => `[${n}](${CITE_PREFIX}${n})`).join(""));
}

/** Văn bản (đã chuẩn hóa) có công thức không: chỉ khi đó mới tải KaTeX. */
export const hasMath = (text: string) => text.includes("$");
