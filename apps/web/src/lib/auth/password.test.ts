import { describe, expect, it } from "vitest";

import { hashPassword, temporaryPassword, verifyPassword } from "./password";

describe("mật khẩu", () => {
  it("băm có muối, kiểm tra đúng và sai", async () => {
    const a = await hashPassword("mat-khau-123");
    const b = await hashPassword("mat-khau-123");
    expect(a).not.toBe(b);
    expect(await verifyPassword("mat-khau-123", a)).toBe(true);
    expect(await verifyPassword("mat-khau-124", a)).toBe(false);
    expect(await verifyPassword("mat-khau-123", "hong")).toBe(false);
  });

  it("mật khẩu tạm đủ dài, không có ký tự dễ nhầm", () => {
    const p = temporaryPassword();
    expect(p).toHaveLength(12);
    expect(p).not.toMatch(/[0O1lI]/);
  });
});
