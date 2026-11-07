import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

import type { DrawState } from "../grade";
import type { QuizBank } from "../merge";
import type { QuizQuestion } from "../types";
import { drawQuiz } from "./bank";

const { quizDraws } = schema;

/** Đề quá số ngày này thì xóa (chưa nộp thì không còn ai làm tiếp; đã nộp thì không còn ôn lại câu sai). */
const KEEP_DAYS = 30;

/** Rút một đề mới và ghi lại các câu của đề, để lúc nộp máy chủ chỉ chấm đúng các câu đó. */
export async function issueQuiz(visitorId: string, bank: QuizBank): Promise<{ drawId: string; questions: QuizQuestion[] }> {
  const questions = drawQuiz(bank);
  const drawId = randomUUID();
  await db.insert(quizDraws).values({ id: drawId, visitorId, subject: bank.subject, chapter: bank.chapter, questionIds: questions.map((q) => q.id) });
  await db
    .delete(quizDraws)
    .where(and(eq(quizDraws.visitorId, visitorId), lt(quizDraws.createdAt, sql`now() - make_interval(days => ${KEEP_DAYS})`)));
  return { drawId, questions };
}

/** Đề của đúng học viên này, hoặc null. */
export async function getDraw(id: string, visitorId: string): Promise<(DrawState & { subject: string; chapter: number }) | null> {
  const [row] = await db
    .select({ subject: quizDraws.subject, chapter: quizDraws.chapter, questionIds: quizDraws.questionIds, wrongIds: quizDraws.wrongIds })
    .from(quizDraws)
    .where(and(eq(quizDraws.id, id), eq(quizDraws.visitorId, visitorId)));
  return row ?? null;
}

/** Đánh dấu đề đã nộp kèm các câu sai. Trả false nếu đề đã nộp trước đó (hai tab cùng nộp). */
export async function closeDraw(id: string, visitorId: string, wrongIds: string[]): Promise<boolean> {
  const rows = await db
    .update(quizDraws)
    .set({ submittedAt: sql`now()`, wrongIds })
    .where(and(eq(quizDraws.id, id), eq(quizDraws.visitorId, visitorId), isNull(quizDraws.submittedAt)))
    .returning({ id: quizDraws.id });
  return rows.length > 0;
}
