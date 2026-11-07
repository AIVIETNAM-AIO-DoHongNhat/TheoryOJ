"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { requireStudent } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

import { buildLayout, classMatches, effectiveDeadline, examPhase, grade, GRACE_MS } from "./logic";
import { getExam, questionsOf } from "./server/exams";

const { exams, examAttempts } = schema;

const Answers = z.record(z.string().max(80), z.number().int().min(0).max(5)).refine((a) => Object.keys(a).length <= 200);

/** Bắt đầu một lượt làm. Đang có lượt dở thì dùng lại lượt đó (bấm hai lần, mở hai tab). */
export async function startExam(examId: number): Promise<ActionResult> {
  const user = await requireStudent();
  const id = z.number().int().positive().parse(examId);
  const exam = await getExam(id);
  if (!exam || exam.status !== "da-giao" || !classMatches(exam.classes, user.className)) return { ok: false, error: "Đề này không giao cho lớp của đồng chí." };
  const phase = examPhase(exam, new Date());
  if (phase === "sap-mo") return { ok: false, error: "Đề chưa tới giờ mở." };
  if (phase === "da-dong") return { ok: false, error: "Đề đã đóng." };

  const own = await db
    .select({ submittedAt: examAttempts.submittedAt })
    .from(examAttempts)
    .where(and(eq(examAttempts.examId, id), eq(examAttempts.userId, user.id)));
  if (!own.some((a) => !a.submittedAt)) {
    if (own.length >= exam.maxAttempts) return { ok: false, error: "Đồng chí đã dùng hết số lượt làm của đề này." };
    const questions = questionsOf(exam);
    await db
      .insert(examAttempts)
      .values({
        examId: id,
        userId: user.id,
        deadline: new Date(Date.now() + exam.durationMin * 60_000),
        layout: buildLayout(questions, exam.shuffle),
        total: questions.length,
      })
      // Chỉ mục duy nhất trên lượt đang làm chặn lượt thứ hai khi hai yêu cầu tới cùng lúc.
      .onConflictDoNothing();
  }
  revalidatePath(`/de-thi/${id}`);
  revalidatePath("/de-thi");
  return { ok: true };
}

async function openAttempt(attemptId: number, userId: string) {
  const [row] = await db
    .select({ attempt: examAttempts, exam: exams })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId)));
  return row ?? null;
}

/** Chỉ giữ đáp án của câu có trong đề và phương án có trong câu. */
function cleanAnswers(questions: ReturnType<typeof questionsOf>, answers: Record<string, number>) {
  const byKey = new Map(questions.map((q) => [q.key, q]));
  return Object.fromEntries(Object.entries(answers).filter(([k, v]) => (byKey.get(k)?.options.length ?? 0) > v));
}

/** Lưu đáp án trong lúc làm, để mất mạng, tải lại trang hay hết giờ vẫn giữ phần đã chọn. */
export async function saveExamAnswers(input: { attemptId: number; answers: Record<string, number> }): Promise<ActionResult<{ expired?: boolean }>> {
  const user = await requireStudent();
  const attemptId = z.number().int().positive().parse(input.attemptId);
  const answers = Answers.parse(input.answers);
  const row = await openAttempt(attemptId, user.id);
  if (!row) return { ok: false, error: "Không tìm thấy bài làm." };
  if (row.attempt.submittedAt) return { ok: false, error: "Bài đã nộp." };
  if (Date.now() > effectiveDeadline(row.attempt.deadline, row.exam.closesAt).getTime() + GRACE_MS) {
    return { ok: true, expired: true };
  }
  await db
    .update(examAttempts)
    .set({ answers: cleanAnswers(questionsOf(row.exam), answers) })
    .where(and(eq(examAttempts.id, attemptId), isNull(examAttempts.submittedAt)));
  return { ok: true };
}

/** Nộp bài. Nộp sau hạn (quá thời gian cho phép trễ) thì chỉ chấm phần đã lưu trước hạn. */
export async function submitExam(input: { attemptId: number; answers: Record<string, number> }): Promise<ActionResult> {
  const user = await requireStudent();
  const attemptId = z.number().int().positive().parse(input.attemptId);
  const answers = Answers.parse(input.answers);
  const row = await openAttempt(attemptId, user.id);
  if (!row) return { ok: false, error: "Không tìm thấy bài làm." };
  const { attempt, exam } = row;
  if (!attempt.submittedAt) {
    const questions = questionsOf(exam);
    const deadline = effectiveDeadline(attempt.deadline, exam.closesAt);
    const late = Date.now() > deadline.getTime() + GRACE_MS;
    const final = late ? attempt.answers : cleanAnswers(questions, answers);
    const { score } = grade(questions, final);
    await db
      .update(examAttempts)
      .set({ answers: final, score, submittedAt: late ? deadline : sql`now()`, autoSubmitted: late })
      .where(and(eq(examAttempts.id, attemptId), isNull(examAttempts.submittedAt)));
  }
  revalidatePath(`/de-thi/${exam.id}`);
  revalidatePath("/de-thi");
  return { ok: true };
}
