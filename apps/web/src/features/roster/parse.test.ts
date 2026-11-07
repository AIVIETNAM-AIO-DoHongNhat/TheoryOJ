import { describe, expect, it } from "vitest";

import { normalizeClassName } from "./normalize";
import { parseRosterText } from "./parse";

describe("tên lớp", () => {
  it("cùng một lớp dù viết hoa thường, thừa khoảng trắng", () => {
    expect(normalizeClassName(" b2k60 ")).toBe("B2K60");
    expect(normalizeClassName("Lớp  d1   k50")).toBe("LỚP D1 K50");
  });
});

describe("đọc danh sách học viên", () => {
  it("nhận cột cách bằng tab (chép từ Excel), bỏ dòng tiêu đề và cột số thứ tự", () => {
    const rows = parseRosterText("STT\tMã\tHọ tên\tLớp\n1\tb2k60-001\tNguyễn Văn An\tb2k60\n2\tB2K60-002\tTrần  Thị Bình\tB2K60");
    expect(rows).toEqual([
      { line: 2, data: { studentCode: "B2K60-001", fullName: "Nguyễn Văn An", className: "B2K60" } },
      { line: 3, data: { studentCode: "B2K60-002", fullName: "Trần Thị Bình", className: "B2K60" } },
    ]);
  });

  it("nhận dấu chấm phẩy, dấu phẩy; bỏ dòng trống", () => {
    const rows = parseRosterText("Mã học viên; Họ và tên; Lớp\nA01; Lê Văn C; D1\n\nA02, Phạm Thị D, D2");
    expect(rows.map((r) => r.data?.studentCode)).toEqual(["A01", "A02"]);
  });

  it("báo lỗi theo dòng: thiếu cột, mã sai dạng, mã trùng", () => {
    const rows = parseRosterText("A01\tNguyễn Văn A\nA 02\tTrần B\tD1\nA03\tLê C\tD1\na03\tLê C\tD1");
    expect(rows.map((r) => [r.line, !!r.error])).toEqual([[1, true], [2, true], [3, false], [4, true]]);
    expect(rows[3].error).toContain("dòng 3");
  });
});
