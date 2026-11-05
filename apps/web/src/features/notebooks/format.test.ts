import { describe, expect, it } from "vitest";

import { applyFormat, type Edit, wordCount } from "./format";
import { notebookToMarkdown, plainExcerpt } from "./types";

const run = (value: string, start: number, end: number, e: Edit) => ({
  text: value.slice(0, e.from) + e.insert + value.slice(e.to),
  sel: [e.selStart, e.selEnd],
});

describe("định dạng trong ô soạn", () => {
  it("bao chữ đậm quanh vùng chọn, bấm lần nữa thì bỏ", () => {
    const v = "giá trị thặng dư";
    const once = run(v, 8, 16, applyFormat(v, 8, 16, "bold"));
    expect(once.text).toBe("giá trị **thặng dư**");
    expect(once.text.slice(once.sel[0], once.sel[1])).toBe("thặng dư");
    const twice = run(once.text, once.sel[0], once.sel[1], applyFormat(once.text, once.sel[0], once.sel[1], "bold"));
    expect(twice.text).toBe(v);
  });

  it("không chọn gì thì chèn chữ mẫu và chọn sẵn nó", () => {
    const r = run("", 0, 0, applyFormat("", 0, 0, "math"));
    expect(r.text).toBe("$m' = m/v$");
    expect(r.text.slice(r.sel[0], r.sel[1])).toBe("m' = m/v");
  });

  it("thêm gạch đầu dòng cho mọi dòng được chọn, bỏ khi đã có", () => {
    const v = "Tư bản bất biến\nTư bản khả biến";
    const r = run(v, 0, v.length, applyFormat(v, 0, v.length, "bullet"));
    expect(r.text).toBe("- Tư bản bất biến\n- Tư bản khả biến");
    expect(run(r.text, 0, r.text.length, applyFormat(r.text, 0, r.text.length, "bullet")).text).toBe(v);
  });

  it("đánh số lần lượt, chỉ tác động các dòng chứa vùng chọn", () => {
    const v = "Mở đầu\nmột\nhai\nKết";
    const s = v.indexOf("một") + 1;
    const e = v.indexOf("hai") + 1;
    expect(run(v, s, e, applyFormat(v, s, e, "numbered")).text).toBe("Mở đầu\n1. một\n2. hai\nKết");
  });

  it("tiêu đề thay cấp cũ chứ không chồng dấu #", () => {
    const v = "# Chương 3";
    expect(run(v, 2, 2, applyFormat(v, 2, 2, "heading")).text).toBe("## Chương 3");
  });
});

describe("đoạn trích và tải về", () => {
  it("bỏ ký hiệu Markdown và liên kết", () => {
    expect(plainExcerpt("## Ý chính\n> **m'** là [tỷ suất](/thu-vien/x)\n\n$$m' = m/v$$")).toBe("Ý chính m' là tỷ suất [công thức]");
  });

  it("thay công thức nội dòng, giữ dấu \\$ đã thoát", () => {
    expect(plainExcerpt("Tỷ suất: $m' = \\frac{m}{v}$, giá \\$5")).toBe("Tỷ suất: [công thức], giá \\$5");
  });

  it("đếm chữ tiếng Việt, bỏ dấu đứng riêng", () => {
    expect(wordCount("- Giá trị thặng dư — m")).toBe(5);
  });

  it("ghép sổ thành một file Markdown", () => {
    const md = notebookToMarkdown({ title: "Sổ KTCT", description: "" }, [
      { title: "Chương 1", body: "Nội dung\n", updatedAt: "" },
      { title: "", body: "Hai", updatedAt: "" },
    ]);
    expect(md).toBe("# Sổ KTCT\n\n## Chương 1\n\nNội dung\n\n---\n\n## Trang chưa đặt tên\n\nHai\n");
  });
});
