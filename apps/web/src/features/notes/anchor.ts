import { CONTEXT_LEN, QUOTE_MAX } from "./types";

// Định vị đoạn trích trong văn bản thuần (textContent của vùng đọc). Phần DOM ở dom.ts.

/** Gộp khoảng trắng để so khớp không phụ thuộc xuống dòng, thụt lề của HTML. */
export const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Đoạn trích cùng vài ký tự trước, sau, từ vị trí [start, end) trong `text`. Null nếu đoạn rỗng hoặc quá dài. */
export function captureContext(text: string, start: number, end: number) {
  const quote = squash(text.slice(start, end));
  if (!quote || quote.length > QUOTE_MAX) return null;
  return {
    quote,
    prefix: squash(text.slice(Math.max(0, start - CONTEXT_LEN), start)).slice(-CONTEXT_LEN),
    suffix: squash(text.slice(end, end + CONTEXT_LEN)).slice(0, CONTEXT_LEN),
  };
}

/** Độ dài phần cuối của `a` trùng với phần cuối của `b` (so ký tự). */
function commonSuffix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonPrefix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Tìm lại đoạn trích trong `text`. Trả vị trí [start, end) theo chỉ số của `text` gốc (chưa gộp khoảng trắng).
 * Nếu đoạn trích xuất hiện nhiều lần, chọn chỗ có ngữ cảnh trước, sau khớp nhiều nhất.
 */
export function locate(text: string, a: { quote: string; prefix: string; suffix: string }): { start: number; end: number } | null {
  // Gộp khoảng trắng nhưng giữ bảng ánh xạ về chỉ số gốc.
  let flat = "";
  const map: number[] = [];
  let space = true;
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) {
      if (!space) {
        flat += " ";
        map.push(i);
        space = true;
      }
    } else {
      flat += text[i];
      map.push(i);
      space = false;
    }
  }
  map.push(text.length);

  const quote = squash(a.quote);
  if (!quote) return null;
  let best: { at: number; score: number } | null = null;
  for (let at = flat.indexOf(quote); at !== -1; at = flat.indexOf(quote, at + 1)) {
    const before = flat.slice(Math.max(0, at - a.prefix.length - 1), at).trimEnd();
    const after = flat.slice(at + quote.length, at + quote.length + a.suffix.length + 1).trimStart();
    const score = commonSuffix(before, a.prefix) + commonPrefix(after, a.suffix);
    if (!best || score > best.score) best = { at, score };
  }
  if (!best) return null;
  const end = best.at + quote.length;
  return { start: map[best.at], end: map[end - 1] + 1 };
}
