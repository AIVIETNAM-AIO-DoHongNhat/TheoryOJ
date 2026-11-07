import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { UserError } from "@/lib/action-result";
import { db, schema } from "@/lib/db";

import { SESSION_COOKIE } from "./cookie";

// Phiên đăng nhập lưu trong Postgres, cookie chỉ giữ mã phiên ngẫu nhiên; DB lưu SHA-256 của mã đó,
// nên lộ bảng sessions cũng không dùng lại được phiên.

export { SESSION_COOKIE } from "./cookie";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  visitorId: string;
  role: "hoc-vien" | "giang-vien";
  /** Môn giảng viên phụ trách chấm bài; rỗng với học viên. */
  subjects: string[];
  sessionId: string;
}

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Tạo phiên mới và ghi cookie. Chỉ gọi trong Server Action hoặc route handler. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: digest(token), userId, expiresAt });
  // Dọn phiên đã hết hạn của người này (đăng nhập nhiều máy lâu ngày), và thỉnh thoảng của mọi người.
  await db.delete(schema.sessions).where(
    Math.random() < 0.05 ? lt(schema.sessions.expiresAt, sql`now()`) : and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, sql`now()`)),
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    path: "/", expires: expiresAt, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  });
}

/** Người đang đăng nhập, hoặc null. Gọi nhiều lần trong một yêu cầu chỉ đọc DB một lần. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({
      id: schema.users.id,
      studentCode: schema.users.studentCode,
      fullName: schema.users.fullName,
      className: schema.users.className,
      visitorId: schema.users.visitorId,
      role: schema.users.role,
      subjects: schema.users.subjects,
      sessionId: schema.sessions.id,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, digest(token)), gt(schema.sessions.expiresAt, sql`now()`)))
    .limit(1);
  return row ?? null;
});

/** Đăng xuất trên trình duyệt này: xóa phiên và cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, digest(token)));
  store.delete(SESSION_COOKIE);
}

/** Đổi mật khẩu thì đăng xuất các thiết bị khác, giữ phiên hiện tại. */
export async function endOtherSessions(user: CurrentUser): Promise<void> {
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, user.sessionId)));
}

/** Chỉ học viên đã đăng nhập mới làm bài, ôn thẻ, hỏi trợ lý: kết quả luôn thuộc đúng một tài khoản học viên. */
export const isStudent = (user: CurrentUser | null): user is CurrentUser => user?.role === "hoc-vien";

/** Server Action làm bài gọi hàm này. Trang đã chặn trước, nên lỗi ở đây chỉ xảy ra khi phiên hết hạn giữa chừng. */
export async function requireStudent(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!isStudent(user)) throw new UserError("Phiên đăng nhập đã hết hạn hoặc tài khoản không phải học viên. Đồng chí đăng nhập lại rồi thử lại.");
  return user;
}

/**
 * Trang và Server Action của /quan-tri gọi hàm này đầu tiên. Ai không phải giảng viên đã đăng nhập (khách, học viên,
 * phiên hết hạn) đều nhận trang 404 như một đường dẫn không tồn tại, để không lộ là trang quản trị có thật.
 * Giảng viên đăng nhập ở /dang-nhap như mọi người; homeFor (features/auth/schemas.ts) đưa thẳng vào /quan-tri.
 * proxy.ts chặn trước ở tầng định tuyến khi không có cookie phiên; hàm này là chốt chặn thật (kiểm tra phiên và vai trò).
 */
export async function requireTeacher(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user?.role !== "giang-vien") notFound();
  return user;
}
