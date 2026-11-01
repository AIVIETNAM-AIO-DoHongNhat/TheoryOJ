import "server-only";

import { and, eq, notInArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export function findUserByCode(studentCode: string) {
  return db.query.users.findFirst({ where: eq(schema.users.studentCode, studentCode) });
}

/** Tạo tài khoản. Trả null nếu mã học viên đã có người dùng. */
export async function createUser(input: { studentCode: string; fullName: string; className: string; passwordHash: string }) {
  const [row] = await db
    .insert(schema.users)
    .values({ id: crypto.randomUUID(), visitorId: crypto.randomUUID(), ...input })
    .onConflictDoNothing({ target: schema.users.studentCode })
    .returning();
  return row ?? null;
}

export async function touchLogin(userId: string) {
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
}

export async function updatePassword(userId: string, passwordHash: string) {
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));
}

export async function updateProfile(userId: string, input: { fullName: string; className: string }) {
  await db.update(schema.users).set(input).where(eq(schema.users.id, userId));
}

/**
 * Gộp dữ liệu đã làm khi chưa đăng nhập (mã khách của trình duyệt) vào tài khoản.
 * Khảo sát mỗi đợt chỉ giữ một phiếu: tài khoản đã có phiếu đợt nào thì bỏ phiếu ẩn danh của đợt đó.
 */
export async function mergeVisitor(from: string, into: string) {
  if (from === into) return;
  await db.transaction(async (tx) => {
    const { conversations, practiceAttempts, feedback, surveyResponses } = schema;
    await tx.update(conversations).set({ visitorId: into }).where(eq(conversations.visitorId, from));
    await tx.update(practiceAttempts).set({ visitorId: into }).where(eq(practiceAttempts.visitorId, from));
    await tx.update(feedback).set({ visitorId: into }).where(eq(feedback.visitorId, from));
    const taken = tx.select({ phase: surveyResponses.phase }).from(surveyResponses).where(eq(surveyResponses.visitorId, into));
    await tx
      .update(surveyResponses)
      .set({ visitorId: into })
      .where(and(eq(surveyResponses.visitorId, from), notInArray(surveyResponses.phase, taken)));
    await tx.delete(surveyResponses).where(eq(surveyResponses.visitorId, from));
  });
}
