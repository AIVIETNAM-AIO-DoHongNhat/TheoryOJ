import { captureContext, locate } from "./anchor";
import type { ReaderNote } from "./types";

// Chuyển giữa Range của trình duyệt và vị trí ký tự trong textContent của một vùng. Chỉ chạy ở trình duyệt.

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

/** Vị trí ký tự của một điểm (node, offset) trong textContent của `root`. */
function offsetOf(root: Node, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

/** Đoạn bôi đen trong `root` cùng ngữ cảnh. Null nếu vùng chọn nằm ngoài `root` hoặc rỗng. */
export function anchorFromRange(root: Node, range: Range) {
  if (!root.contains(range.commonAncestorContainer)) return null;
  const text = root.textContent ?? "";
  return captureContext(text, offsetOf(root, range.startContainer, range.startOffset), offsetOf(root, range.endContainer, range.endOffset));
}

/** Range ứng với [start, end) trong textContent của `root`. */
export function rangeFromOffsets(root: Node, start: number, end: number): Range | null {
  const range = document.createRange();
  let pos = 0;
  let started = false;
  for (const t of textNodes(root)) {
    const len = t.data.length;
    if (!started && start <= pos + len) {
      range.setStart(t, start - pos);
      started = true;
    }
    if (started && end <= pos + len) {
      range.setEnd(t, end - pos);
      return range;
    }
    pos += len;
  }
  return null;
}

const HIGHLIGHT = "ghi-chu";

/**
 * Tô các đoạn đã ghi chú bằng CSS Custom Highlight API (không sửa DOM do React dựng).
 * Trình duyệt chưa hỗ trợ thì bỏ qua. Trả số đoạn tìm thấy.
 */
export function paintNotes(groups: { root: Node; notes: Pick<ReaderNote, "quote" | "prefix" | "suffix">[] }[]): number {
  if (typeof CSS === "undefined" || !("highlights" in CSS) || typeof Highlight === "undefined") return 0;
  const ranges: Range[] = [];
  for (const { root, notes } of groups) {
    const text = root.textContent ?? "";
    for (const n of notes) {
      const at = locate(text, n);
      const r = at && rangeFromOffsets(root, at.start, at.end);
      if (r) ranges.push(r);
    }
  }
  if (ranges.length) CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
  else CSS.highlights.delete(HIGHLIGHT);
  return ranges.length;
}

export function clearNotePaint() {
  if (typeof CSS !== "undefined" && "highlights" in CSS) CSS.highlights.delete(HIGHLIGHT);
}

let flashTimer: ReturnType<typeof setTimeout> | undefined;

/** Cuộn tới đoạn trích và tô nổi nó trong vài giây. Không đổi vùng chọn, để menu bôi đen không hiện lên. */
export function revealNote(root: Node, n: Pick<ReaderNote, "quote" | "prefix" | "suffix">): boolean {
  const at = locate(root.textContent ?? "", n);
  const r = at && rangeFromOffsets(root, at.start, at.end);
  if (!r) return false;
  r.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
  if (typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined") {
    CSS.highlights.set(`${HIGHLIGHT}-xem`, new Highlight(r));
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => CSS.highlights.delete(`${HIGHLIGHT}-xem`), 2500);
  }
  return true;
}
