import { describe, expect, it } from "vitest";

import { LoginInput, RegisterInput, safeNext } from "./schemas";

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
    expect(safeNext("//evil.com")).toBe("/tien-do");
    expect(safeNext("/\\evil.com")).toBe("/tien-do");
    expect(safeNext("https://evil.com")).toBe("/tien-do");
    expect(safeNext(undefined)).toBe("/tien-do");
  });
});
