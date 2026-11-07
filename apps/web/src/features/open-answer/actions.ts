"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getSubject } from "@/config/subjects";
import type { ActionResult } from "@/lib/action-result";
import { type CurrentUser, getCurrentUser } from "@/lib/auth/session";
import { clientIp, hitRateLimits } from "@/lib/rate-limit";

import { maxScoreOf } from "./grading";
import { submitAttempt } from "./server/attempts";
import { essayRubric, findRebuttal, getEssayBank, rebuttalRubric } from "./server/bank";
import { type AttemptKind, type GradedRubric, MAX_ANSWER, MIN_ANSWER, type Submission } from "./types";

// Học viên nộp bài tự luận, bài phản bác. Bài vào hàng chờ của giảng viên phụ trách môn, không chấm tự động.
// Giới hạn tần suất để không ai gửi tràn hàng chờ của giảng viên.

async function gate(): Promise<CurrentUser | string> {
  const user = await getCurrentUser();
  if (!user) return "Đồng chí cần đăng nhập để nộp bài.";
  const wait = await hitRateLimits([
    { key: `nopbai10:${user.visitorId}`, windowSec: 600, max: 15 },
    { key: `nopbaiday:${user.visitorId}`, windowSec: 86_400, max: 60 },
    { key: `nopbaiip:${clientIp(await headers())}`, windowSec: 600, max: 200 },
  ]);
  if (wait > 0) return `Đồng chí đã nộp nhiều bài trong thời gian ngắn. Thử lại sau ${Math.max(1, Math.ceil(wait / 60))} phút.`;
  return user;
}

const answerSchema = z.string().trim()
  .min(MIN_ANSWER, `Bài làm cần ít nhất ${MIN_ANSWER} ký tự.`)
  .max(MAX_ANSWER, `Bài làm tối đa ${MAX_ANSWER.toLocaleString("vi-VN")} ký tự.`);

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

async function save(user: CurrentUser, input: {
  subject: string;
  chapter: number;
  kind: AttemptKind;
  itemId: string;
  rubric: GradedRubric;
  answer: string;
}): Promise<ActionResult<{ submission: Submission }>> {
  const { id, submittedAt } = await submitAttempt({
    visitorId: user.visitorId,
    userId: user.id,
    ...input,
    maxScore: maxScoreOf(input.rubric),
  });
  return { ok: true, submission: { attemptId: id, answer: input.answer, submittedAt: submittedAt.toISOString(), status: "cho_cham" } };
}

const EssayInput = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
  questionId: z.string().max(32),
  answer: answerSchema,
});

/** Nộp (hoặc sửa bài đang chờ chấm) một câu tự luận. */
export async function submitEssay(input: z.input<typeof EssayInput>): Promise<ActionResult<{ submission: Submission }>> {
  const parsed = EssayInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { subject, chapter, questionId, answer } = parsed.data;
  const question = getSubject(subject)?.active ? getEssayBank(subject, chapter)?.questions.find((q) => q.id === questionId) : null;
  if (!question) return { ok: false, error: "Không tìm thấy câu hỏi." };

  const user = await gate();
  if (typeof user === "string") return { ok: false, error: user };
  return save(user, { subject, chapter, kind: "tu_luan", itemId: question.id, rubric: essayRubric(question), answer });
}

const RebuttalInput = z.object({
  subject: z.string().max(32),
  itemId: z.string().max(32),
  answer: answerSchema,
});

/** Nộp (hoặc sửa bài đang chờ chấm) một bài phản bác. Học viên chỉ nộp được luận điệu đã duyệt. */
export async function submitRebuttal(input: z.input<typeof RebuttalInput>): Promise<ActionResult<{ submission: Submission }>> {
  const parsed = RebuttalInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { subject: subjectId, itemId, answer } = parsed.data;
  const subject = getSubject(subjectId);
  if (!subject?.active) return { ok: false, error: "Không tìm thấy môn học." };

  const user = await gate();
  if (typeof user === "string") return { ok: false, error: user };
  const found = findRebuttal(subject.id, subject.chapters.map((c) => c.number), itemId, user.role === "giang-vien");
  if (!found) return { ok: false, error: "Không tìm thấy luận điệu." };
  return save(user, { subject: subject.id, chapter: found.bank.chapter, kind: "phan_bac", itemId, rubric: rebuttalRubric(found.item), answer });
}
