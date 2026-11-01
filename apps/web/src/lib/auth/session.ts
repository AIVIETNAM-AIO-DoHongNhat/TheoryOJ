import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { db, schema } from "@/lib/db";

// Phiên đăng nhập lưu trong Postgres, cookie chỉ giữ mã phiên ngẫu nhiên; DB lưu SHA-256 của mã đó,
// nên lộ bảng sessions cũng không dùng lại được phiên.

export const SESSION_COOKIE = "theoryoj_phien";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  visitorId: string;
  sessionId: string;
}

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Tạo phiên mới và ghi cookie. Chỉ gọi trong Server Action hoặc route handler. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: digest(token), userId, expiresAt });
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
