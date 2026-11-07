import { describe, expect, it } from "vitest";

import { parseRoute, resolveDocument, type RouteContext } from "./router";

const ctx: RouteContext = { chapterNumbers: [1, 2, 3, 4, 5, 6], documents: ["van-kien/14-NQ-68-NQ-TW-2025.md"] };
const q = "câu hỏi gốc";

describe("parseRoute", () => {
  it("đọc câu hỏi đáp", () => {
    const r = parseRoute('{"nhan":"hop_le","y_dinh":"hoi_dap","pham_vi":null,"truy_van":"Giá trị thặng dư là gì"}', ctx, q, false);
    expect(r).toMatchObject({ label: "hop_le", intent: "hoi_dap", scope: null, query: "Giá trị thặng dư là gì" });
  });

  it("chịu được chữ thừa và khối ``` quanh JSON", () => {
    const r = parseRoute('Kết quả:\n```json\n{"nhan":"khieu_khich","y_dinh":"hoi_dap","pham_vi":null,"truy_van":"x y z"}\n```', ctx, q, false);
    expect(r?.label).toBe("khieu_khich");
  });

  it("đọc phạm vi chương, bỏ chương không tồn tại", () => {
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"chuong","chuong":[3]},"truy_van":"abc"}', ctx, q, false)?.scope)
      .toEqual({ kind: "chuong", chapters: [3] });
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"chuong","chuong":[9]},"truy_van":"abc"}', ctx, q, false)?.scope)
      .toEqual({ kind: "chu_de" });
  });

  it("đảo và giới hạn khoảng trang", () => {
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"trang","tu":60,"den":55},"truy_van":"abc"}', ctx, q, false)?.scope)
      .toEqual({ kind: "trang", from: 55, to: 60 });
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"trang","tu":1,"den":500},"truy_van":"abc"}', ctx, q, false)?.scope)
      .toEqual({ kind: "trang", from: 1, to: 40 });
  });

  it("chỉ nhận văn kiện có trong danh mục", () => {
    const ok = '{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"van_kien","ma":"van-kien/14-NQ-68-NQ-TW-2025.md"},"truy_van":"abc"}';
    const bad = '{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"van_kien","ma":"../../.env"},"truy_van":"abc"}';
    expect(parseRoute(ok, ctx, q, false)?.scope).toEqual({ kind: "van_kien", document: "van-kien/14-NQ-68-NQ-TW-2025.md" });
    expect(parseRoute(bad, ctx, q, false)?.scope).toEqual({ kind: "chu_de" });
  });

  it("tóm tắt hội thoại khi chưa có lượt trước thì thành tóm tắt chủ đề", () => {
    const text = '{"nhan":"hop_le","y_dinh":"tom_tat","pham_vi":{"loai":"hoi_thoai"},"truy_van":"abc"}';
    expect(parseRoute(text, ctx, q, true)?.scope).toEqual({ kind: "hoi_thoai" });
    expect(parseRoute(text, ctx, q, false)?.scope).toEqual({ kind: "chu_de" });
  });

  it("bỏ phạm vi khi ý định không phải tóm tắt", () => {
    const r = parseRoute('{"nhan":"hop_le","y_dinh":"hoi_dap","pham_vi":{"loai":"chuong","chuong":[2]},"truy_van":"abc"}', ctx, q, false);
    expect(r?.scope).toBeNull();
  });

  it("giữ câu gốc khi truy_van rỗng hoặc quá ngắn", () => {
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"hoi_dap","pham_vi":null,"truy_van":""}', ctx, q, false)?.query).toBe(q);
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"hoi_dap","pham_vi":null}', ctx, q, false)?.query).toBe(q);
  });

  it("trả null khi sai cấu trúc để dùng luồng cũ", () => {
    expect(parseRoute("hop_le", ctx, q, false)).toBeNull();
    expect(parseRoute('{"nhan":"khong_ro","y_dinh":"hoi_dap"}', ctx, q, false)).toBeNull();
    expect(parseRoute('{"nhan":"hop_le","y_dinh":"hoi_dap"', ctx, q, false)).toBeNull();
  });
});

describe("resolveDocument", () => {
  const docs = [
    "van-kien/13-NQ-11-NQ-TW-2017.md",
    "van-kien/14-NQ-68-NQ-TW-2025.md",
    "van-kien/15-NQ-57-NQ-TW-2024.md",
    "tham-khao/15b-Hoi-Dap-NQ-57-NQ-TW.pdf",
    "tham-khao/20-VJOL-Hoan-thien-the-che-KTTN-NQ68.pdf",
  ];

  it("nhận mã thiếu thư mục, tên văn bản hoặc số hiệu", () => {
    expect(resolveDocument("14-NQ-68-NQ-TW-2025.md", docs)).toBe("van-kien/14-NQ-68-NQ-TW-2025.md");
    expect(resolveDocument("Nghị quyết 57-NQ/TW", docs)).toBe("van-kien/15-NQ-57-NQ-TW-2024.md");
    expect(resolveDocument("11", docs)).toBe("van-kien/13-NQ-11-NQ-TW-2017.md");
  });

  it("không đoán khi không khớp", () => {
    expect(resolveDocument("Nghị quyết 99-NQ/TW", docs)).toBeNull();
    expect(resolveDocument("../../.env", docs)).toBeNull();
  });
});
