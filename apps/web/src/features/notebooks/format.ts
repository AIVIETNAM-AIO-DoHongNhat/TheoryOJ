/** Thao tác định dạng Markdown trên ô soạn. Hàm thuần: nhận chữ và vùng chọn, trả đoạn cần thay và vùng chọn mới. */

export type FormatKind = "bold" | "italic" | "heading" | "bullet" | "numbered" | "quote" | "math";

export interface Edit {
  /** Thay [from, to) của chữ cũ bằng `insert`. */
  from: number;
  to: number;
  insert: string;
  /** Vùng chọn sau khi thay, theo chỉ số của chữ mới. */
  selStart: number;
  selEnd: number;
}

const WRAP: Partial<Record<FormatKind, { mark: string; placeholder: string }>> = {
  bold: { mark: "**", placeholder: "chữ đậm" },
  italic: { mark: "_", placeholder: "chữ nghiêng" },
  math: { mark: "$", placeholder: "m' = m/v" },
};

function wrap(value: string, start: number, end: number, mark: string, placeholder: string): Edit {
  const selected = value.slice(start, end);
  // Đã có dấu bao quanh vùng chọn: bỏ dấu.
  if (value.slice(start - mark.length, start) === mark && value.slice(end, end + mark.length) === mark) {
    return { from: start - mark.length, to: end + mark.length, insert: selected, selStart: start - mark.length, selEnd: end - mark.length };
  }
  const text = selected || placeholder;
  return { from: start, to: end, insert: `${mark}${text}${mark}`, selStart: start + mark.length, selEnd: start + mark.length + text.length };
}

const LINE_PREFIX: Partial<Record<FormatKind, string>> = { heading: "## ", bullet: "- ", quote: "> " };

function prefixLines(value: string, start: number, end: number, kind: FormatKind): Edit {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nl = value.indexOf("\n", end > start && value[end - 1] === "\n" ? end - 1 : end);
  const to = nl === -1 ? value.length : nl;
  const lines = value.slice(from, to).split("\n");
  const numbered = kind === "numbered";
  const pattern = numbered ? /^\d+\.\s/ : new RegExp(`^${LINE_PREFIX[kind]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const all = lines.every((l) => !l.trim() || pattern.test(l));
  let n = 0;
  const out = lines.map((l) => {
    if (all) return l.replace(pattern, "");
    if (!l.trim() && lines.length > 1) return l;
    // Tiêu đề thay cho tiêu đề cấp khác thay vì chồng dấu #.
    const bare = kind === "heading" ? l.replace(/^#{1,6}\s/, "") : l;
    return `${numbered ? `${++n}. ` : LINE_PREFIX[kind]}${bare}`;
  });
  const insert = out.join("\n");
  // Một dòng trống: đặt con trỏ sau dấu vừa thêm để gõ tiếp.
  const caret = start === end && lines.length === 1;
  return { from, to, insert, selStart: caret ? from + insert.length : from, selEnd: from + insert.length };
}

export function applyFormat(value: string, start: number, end: number, kind: FormatKind): Edit {
  const w = WRAP[kind];
  return w ? wrap(value, start, end, w.mark, w.placeholder) : prefixLines(value, start, end, kind);
}

/** Số chữ (từ) trong ghi chép, bỏ ký hiệu Markdown đứng riêng. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
