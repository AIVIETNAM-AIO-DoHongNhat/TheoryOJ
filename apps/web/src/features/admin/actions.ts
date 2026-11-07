"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { requireTeacher } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

import { markReviewed } from "./server/review";

/** Đánh dấu (hoặc bỏ đánh dấu) đã xem các câu trả lời trong nhật ký hỏi đáp. */
export async function setReviewed(input: { ids: string[]; reviewed: boolean }): Promise<void> {
  await requireTeacher();
  const { ids, reviewed } = z.object({ ids: z.array(z.string().max(64)).max(100), reviewed: z.boolean() }).parse(input);
  await markReviewed(ids, reviewed);
  revalidatePath("/quan-tri", "layout");
}

/**
 * Đặt lại mật khẩu học viên quên mật khẩu: sinh mật khẩu tạm, đăng xuất mọi thiết bị của học viên.
 * Mật khẩu tạm chỉ trả về một lần để giảng viên báo cho học viên; không lưu dạng rõ ở đâu.
 */
export async function resetStudentPassword(userId: string): Promise<{ password: string }> {
  await requireTeacher();
  const id = z.string().uuid().parse(userId);
  const password = temporaryPassword();
  const [user] = await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password) })
    .where(and(eq(schema.users.id, id), eq(schema.users.role, "hoc-vien")))
    .returning({ id: schema.users.id });
  if (!user) throw new Error("Không có học viên này.");
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  return { password };
}
