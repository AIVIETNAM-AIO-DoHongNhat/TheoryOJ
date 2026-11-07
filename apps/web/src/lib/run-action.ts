import "server-only";

import { z } from "zod";

import { type DataResult, UserError } from "./action-result";

// Lời nhắn mặc định của Zod bằng tiếng Việt, vì lỗi kiểm tra đầu vào được trả thẳng cho người dùng.
z.config(z.locales.vi());

/**
 * Bọc thân một Server Action. Lỗi người dùng (`UserError`) và lỗi kiểm tra đầu vào (Zod) thành `{ ok: false, error }`
 * để trình duyệt nhận đúng lời nhắn; lỗi khác vẫn ném ra (Next.js ghi log, trình duyệt nhận lỗi chung).
 */
export async function run<T>(body: () => Promise<T>): Promise<DataResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    if (error instanceof UserError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
    throw error;
  }
}
