import { describe, expect, it } from "vitest";

import { ActionError, errorMessage, unwrap } from "./action-result";

describe("unwrap", () => {
  it("trả dữ liệu khi thành công", () => {
    expect(unwrap({ ok: true, data: 42 })).toBe(42);
  });

  it("ném ActionError mang lời nhắn của máy chủ", () => {
    expect(() => unwrap({ ok: false, error: "Mỗi sổ có tối đa 20 trang." })).toThrow(ActionError);
    expect(() => unwrap({ ok: false, error: "Mỗi sổ có tối đa 20 trang." })).toThrow("Mỗi sổ có tối đa 20 trang.");
  });
});

describe("errorMessage", () => {
  it("dùng lời nhắn của máy chủ với lỗi do unwrap ném", () => {
    expect(errorMessage(new ActionError("Không có sổ này."), "Dự phòng")).toBe("Không có sổ này.");
  });

  it("dùng câu dự phòng với lỗi mạng hoặc lỗi Next.js che nội dung", () => {
    expect(errorMessage(new TypeError("Failed to fetch"), "Dự phòng")).toBe("Dự phòng");
    expect(errorMessage(new Error("An error occurred in the Server Components render."), "Dự phòng")).toBe("Dự phòng");
    expect(errorMessage("chuỗi", "Dự phòng")).toBe("Dự phòng");
  });
});
