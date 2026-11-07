import { describe, expect, it } from "vitest";

import type { RangeChunk } from "@/lib/search/range";

import { batchGroups, groupChunks, rangeLabel } from "./summary-groups";

const chunk = (over: Partial<RangeChunk>): RangeChunk => ({
  text: "x".repeat(10),
  document: "giao-trinh/GT.pdf",
  document_title: "Giáo trình",
  kind: "giao_trinh",
  chapter: 3,
  page: null,
  pdf_page: null,
  section: null,
  ord: 0,
  ...over,
});

describe("groupChunks", () => {
  it("gom giáo trình theo trang PDF, giữ thứ tự", () => {
    const groups = groupChunks([
      chunk({ pdf_page: 51, page: 50, ord: 1 }),
      chunk({ pdf_page: 51, page: 50, ord: 2 }),
      chunk({ pdf_page: 52, page: 51, ord: 3 }),
    ]);
    expect(groups.map((g) => g.chunks.length)).toEqual([2, 1]);
  });

  it("gom văn kiện theo mục cấp một, đoạn không có mục thành phần mở đầu", () => {
    const doc = { document: "van-kien/nq.md", kind: "van_kien" };
    const groups = groupChunks([
      chunk({ ...doc, section: null }),
      chunk({ ...doc, section: "I- QUAN ĐIỂM" }),
      chunk({ ...doc, section: "II- MỤC TIÊU › 1. Đến năm 2030" }),
      chunk({ ...doc, section: "II- MỤC TIÊU › 2. Tầm nhìn" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["van-kien/nq.md#mo-dau", "van-kien/nq.md#I- QUAN ĐIỂM", "van-kien/nq.md#II- MỤC TIÊU"]);
  });
});

describe("batchGroups", () => {
  it("chia lô không vượt giới hạn, nhóm quá dài đứng riêng", () => {
    const groups = groupChunks([
      chunk({ pdf_page: 1, text: "a".repeat(40) }),
      chunk({ pdf_page: 2, text: "a".repeat(40) }),
      chunk({ pdf_page: 3, text: "a".repeat(150) }),
      chunk({ pdf_page: 4, text: "a".repeat(10) }),
    ]);
    expect(batchGroups(groups, 100).map((b) => b.length)).toEqual([2, 1, 1]);
  });
});

describe("rangeLabel", () => {
  it("ghi khoảng trang in", () => {
    const groups = groupChunks([chunk({ pdf_page: 53, page: 52 }), chunk({ pdf_page: 59, page: 58 })]);
    expect(rangeLabel(groups)).toBe("Tóm lược tr. 52–58");
  });
});
