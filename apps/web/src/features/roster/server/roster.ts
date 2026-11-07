import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

import type { RosterRow } from "../parse";

const { studentRoster, users } = schema;

export function findRosterEntry(studentCode: string) {
  return db.query.studentRoster.findFirst({ where: eq(studentRoster.studentCode, studentCode) });
}

export interface RosterEntry extends RosterRow {
  /** Đã có tài khoản với mã này. */
  registered: boolean;
  lastLoginAt: string | null;
}

export async function listRoster(className: string | null): Promise<RosterEntry[]> {
  const rows = await db
    .select({
      studentCode: studentRoster.studentCode,
      fullName: studentRoster.fullName,
      className: studentRoster.className,
      userId: users.id,
      lastLoginAt: users.lastLoginAt,
    })
    .from(studentRoster)
    .leftJoin(users, eq(users.studentCode, studentRoster.studentCode))
    .where(className ? eq(studentRoster.className, className) : undefined)
    .orderBy(asc(studentRoster.className), asc(studentRoster.fullName));
  return rows.map(({ userId, lastLoginAt, ...r }) => ({ ...r, registered: userId !== null, lastLoginAt: lastLoginAt?.toISOString() ?? null }));
}

export async function rosterClasses(): Promise<{ name: string; students: number }[]> {
  const rows = await db
    .select({ name: studentRoster.className, students: sql<number>`count(*)`.mapWith(Number) })
    .from(studentRoster)
    .groupBy(studentRoster.className)
    .orderBy(asc(studentRoster.className));
  return rows;
}

/**
 * Thêm hoặc cập nhật các dòng danh sách, rồi đồng bộ họ tên, lớp của tài khoản học viên đã đăng ký cùng mã.
 * Trả số dòng mới, số dòng đã có được cập nhật, số tài khoản được đồng bộ.
 */
export async function upsertRoster(rows: RosterRow[], teacherId: string): Promise<{ added: number; updated: number; synced: number }> {
  return db.transaction(async (tx) => {
    const codes = rows.map((r) => r.studentCode);
    const existing = new Set(
      (await tx.select({ code: studentRoster.studentCode }).from(studentRoster).where(inArray(studentRoster.studentCode, codes))).map((r) => r.code),
    );
    await tx
      .insert(studentRoster)
      .values(rows.map((r) => ({ ...r, updatedBy: teacherId })))
      .onConflictDoUpdate({
        target: studentRoster.studentCode,
        set: { fullName: sql`excluded.full_name`, className: sql`excluded.class_name`, updatedBy: teacherId, updatedAt: sql`now()` },
      });
    const synced = await tx.execute(sql`
      update users u set full_name = r.full_name, class_name = r.class_name
      from student_roster r
      where r.student_code = u.student_code and u.role = 'hoc-vien'
        and r.student_code in (${sql.join(codes.map((c) => sql`${c}`), sql`, `)})
        and (u.full_name is distinct from r.full_name or u.class_name is distinct from r.class_name)
      returning u.id`);
    return { added: rows.length - existing.size, updated: existing.size, synced: synced.length };
  });
}

/** Bỏ một mã khỏi danh sách. Tài khoản đã đăng ký vẫn đăng nhập được; chỉ là mã đó không đăng ký mới được nữa. */
export async function deleteRosterEntry(studentCode: string): Promise<boolean> {
  const rows = await db.delete(studentRoster).where(eq(studentRoster.studentCode, studentCode)).returning({ code: studentRoster.studentCode });
  return rows.length > 0;
}
