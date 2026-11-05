import { describe, expect, it } from "vitest";

import { homeFor, LoginInput, RegisterInput, safeNext } from "./schemas";

describe("đăng ký, đăng nhập", () => {
  const ok = { studentCode: " b2k60-001 ", fullName: "Nguyễn Văn An", className: "B2K60", password: "12345678", confirm: "12345678" };

  it("mã học viên viết hoa, bỏ khoảng trắng", () => {
    expect(RegisterInput.parse(ok).studentCode).toBe("B2K60-001");
    expect(LoginInput.parse({ studentCode: "b2k60-001", password: "x" }).studentCode).toBe("B2K60-001");
  });

  it("chặn mã sai dạng, mật khẩu ngắn, nhập lại không khớp", () => {
    expect(RegisterInput.safeParse({ ...ok, studentCode: "a b" }).success).toBe(false);
    expect(RegisterInput.safeParse({ ...ok, password: "1234567", confirm: "1234567" }).success).toBe(false);
    expect(RegisterInput.safeParse({ ...ok, confirm: "87654321" }).success).toBe(false);
  });

  it("chỉ chuyển tiếp trong trang", () => {
    expect(safeNext("/tien-do?x=1")).toBe("/tien-do?x=1");
    expect(safeNext("//evil.com")).toBe("/hoc");
    expect(safeNext("/\\evil.com")).toBe("/hoc");
    expect(safeNext("https://evil.com")).toBe("/hoc");
    expect(safeNext(undefined)).toBe("/hoc");
  });
});

describe("trang sau khi đăng nhập", () => {
  it("giảng viên vào trang quản trị, học viên về trang đang mở", () => {
    expect(homeFor("giang-vien", "/tien-do")).toBe("/quan-tri");
    expect(homeFor("giang-vien", undefined)).toBe("/quan-tri");
    expect(homeFor("giang-vien", "/quan-tri/hoi-dap")).toBe("/quan-tri/hoi-dap");
    expect(homeFor("giang-vien", "/quan-trix")).toBe("/quan-tri");
    expect(homeFor("hoc-vien", "/tien-do")).toBe("/tien-do");
    expect(homeFor("hoc-vien", "/quan-tri")).toBe("/quan-tri");
  });
});
