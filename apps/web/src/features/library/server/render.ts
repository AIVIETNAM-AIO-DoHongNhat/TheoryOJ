import fs from "node:fs";

import mammoth from "mammoth";

import type { LibraryDoc } from "../types";
import { docPath, getDoc } from "./catalog";

export interface MarkdownDoc {
  /** Dòng nguồn ở đầu file, ví dụ "Nguồn", "Ngày đăng". */
  meta: { label: string; value: string }[];
  body: string;
}

/**
 * File .md trong content/ mở đầu bằng tiêu đề và vài dòng "- Nguồn: …", ngăn với nội dung bằng "---".
 * Tách phần đó ra để hiện ở đầu trang đọc, phần còn lại là toàn văn.
 */
export function readMarkdownDoc(doc: LibraryDoc): MarkdownDoc {
  const text = fs.readFileSync(docPath(doc), "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const sep = lines.findIndex((l) => l.trim() === "---");
  if (sep < 0 || sep > 15) return { meta: [], body: text };
  const meta = lines
    .slice(0, sep)
    .map((l) => /^-\s*([^:]+):\s*(.+)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ label: m[1].trim(), value: m[2].trim() }))
    // "Ngày tải" là ngày nhóm phát triển tải file về, không có ích cho người đọc.
    .filter((m) => m.label !== "Ngày tải");
  return { meta, body: lines.slice(sep + 1).join("\n") };
}

/** Chuyển .docx sang HTML. File do Khoa đưa vào content/, không phải dữ liệu người dùng. */
export async function renderDocx(slug: string): Promise<string> {
  "use cache";
  const doc = getDoc(slug);
  if (doc?.format !== "docx") return "";
  const { value } = await mammoth.convertToHtml({ path: docPath(doc) });
  return value;
}
