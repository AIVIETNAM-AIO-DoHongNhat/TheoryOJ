import { describe, expect, it } from "vitest";

import { captureContext, locate } from "./anchor";

const text = "Giá trị thặng dư là bộ phận giá trị mới.\n\n  Tư bản bất biến không tạo ra giá trị thặng dư. Giá trị thặng dư do lao động tạo ra.";

describe("định vị đoạn trích", () => {
  it("lấy đoạn trích kèm ngữ cảnh, gộp khoảng trắng", () => {
    const start = text.indexOf("mới.");
    const c = captureContext(text, start, text.indexOf("bất biến") + "bất biến".length)!;
    expect(c.quote).toBe("mới. Tư bản bất biến");
    expect(c.prefix.endsWith("bộ phận giá trị")).toBe(true);
    expect(c.suffix.startsWith("không tạo ra")).toBe(true);
  });

  it("bỏ đoạn rỗng", () => {
    expect(captureContext(text, 40, 42)).toBeNull();
  });

  it("tìm lại đúng lần xuất hiện nhờ ngữ cảnh", () => {
    const second = text.lastIndexOf("Giá trị thặng dư");
    const c = captureContext(text, second, second + "Giá trị thặng dư".length)!;
    expect(locate(text, c)).toEqual({ start: second, end: second + "Giá trị thặng dư".length });

    const first = text.indexOf("Giá trị thặng dư");
    const c1 = captureContext(text, first, first + "Giá trị thặng dư".length)!;
    expect(locate(text, c1)?.start).toBe(first);
  });

  it("đoạn trích qua nhiều dòng vẫn tìm được, trả chỉ số trong văn bản gốc", () => {
    const start = text.indexOf("mới.");
    const end = text.indexOf("bất biến") + "bất biến".length;
    const found = locate(text, captureContext(text, start, end)!);
    expect(found).toEqual({ start, end });
  });

  it("không có thì trả null", () => {
    expect(locate(text, { quote: "giá cả sản xuất", prefix: "", suffix: "" })).toBeNull();
  });
});
