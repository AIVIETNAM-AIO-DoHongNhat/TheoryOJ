"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getSubject } from "@/config/subjects";
import type { ActionResult } from "@/lib/action-result";
import { type CurrentUser, getCurrentUser } from "@/lib/auth/session";
import { clientIp, hitRateLimits } from "@/lib/rate-limit";

import { weakestPoint } from "./grading";
import { getOwnAttempt, saveOpenAttempt } from "./server/attempts";
import { essayRubric, findRebuttal, getEssayBank, rebuttalRubric } from "./server/bank";
import { followUpQuestion, grade, GradingError } from "./server/grade";
import {
  type AttemptKind, type GradedRubric, type GradeResponse, MAX_ANSWER, MAX_FOLLOW_UP, MIN_ANSWER, MIN_FOLLOW_UP,
} from "./types";

// Mỗi lượt chấm tốn một lệnh gọi mô hình lớn, nên giới hạn chặt hơn trợ lý.
const LIMIT_10M = 10;
const LIMIT_DAY = 60;
const LIMIT_IP_10M = 120;

async function gate(): Promise<CurrentUser | string> {
  const user = await getCurrentUser();
  if (!user) return "Đồng chí cần đăng nhập để nộp bài.";
  const wait = await hitRateLimits([
    { key: `cham10:${user.visitorId}`, windowSec: 600, max: LIMIT_10M },
    { key: `chamday:${user.visitorId}`, windowSec: 86_400, max: LIMIT_DAY },
    { key: `chamip:${clientIp(await headers())}`, windowSec: 600, max: LIMIT_IP_10M },
  ]);
  if (wait > 0) return `Đồng chí đã nộp nhiều bài trong thời gian ngắn. Thử lại sau ${Math.ceil(wait / 60)} phút.`;
  return user;
}

const answerSchema = (min: number, max: number) =>
  z.string().trim()
    .min(min, `Bài làm cần ít nhất ${min} ký tự.`)
    .max(max, `Bài làm tối đa ${max.toLocaleString("vi-VN")} ký tự.`);

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

async function gradeAndSave(input: {
  user: CurrentUser;
  subjectId: string;
  chapter: number;
  kind: AttemptKind;
  itemId: string;
  rubric: GradedRubric;
  answer: string;
  claim?: string;
  parentId?: number;
  question?: string;
  published?: GradeResponse["published"];
}): Promise<ActionResult<{ response: GradeResponse }>> {
  const subject = getSubject(input.subjectId)!;
  try {
    const graded = await grade({ subject, kind: input.kind, rubric: input.rubric, answer: input.answer, claim: input.claim });
    const result = input.question ? { ...graded.result, question: input.question } : graded.result;
    const attemptId = await saveOpenAttempt({
      visitorId: input.user.visitorId,
      userId: input.user.id,
      subject: subject.id,
      chapter: input.chapter,
      kind: input.kind,
      itemId: input.itemId,
      parentId: input.parentId,
      answer: input.answer,
      rubric: input.rubric,
      result,
      citations: graded.citations,
      model: graded.model,
      latencyMs: graded.latencyMs,
    });
    return {
      ok: true,
      response: { attemptId, result, rubric: input.rubric, citations: graded.citations, published: input.published },
    };
  } catch (error) {
    if (error instanceof GradingError) return { ok: false, error: error.message };
    console.error("Chấm bài lỗi:", error);
    return { ok: false, error: "Hệ thống chấm đang bận. Đồng chí thử nộp lại sau ít phút; bài làm vẫn được giữ trên trang." };
  }
}

const EssayInput = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
  questionId: z.string().max(32),
  answer: answerSchema(MIN_ANSWER, MAX_ANSWER),
});

/** Nộp bài tự luận: chấm theo barem của câu, lưu lượt làm. */
export async function submitEssay(input: z.input<typeof EssayInput>): Promise<ActionResult<{ response: GradeResponse }>> {
  const parsed = EssayInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { subject, chapter, questionId, answer } = parsed.data;
  const question = getSubject(subject)?.active ? getEssayBank(subject, chapter)?.questions.find((q) => q.id === questionId) : null;
  if (!question) return { ok: false, error: "Không tìm thấy câu hỏi." };

  const user = await gate();
  if (typeof user === "string") return { ok: false, error: user };
  return gradeAndSave({ user, subjectId: subject, chapter, kind: "tu_luan", itemId: question.id, rubric: essayRubric(question), answer });
}

const RebuttalInput = z.object({
  subject: z.string().max(32),
  itemId: z.string().max(32),
  answer: answerSchema(MIN_ANSWER, MAX_ANSWER),
});

/** Nộp bài phản bác. Học viên chỉ nộp được luận điệu đã duyệt; giảng viên thử được cả bản nháp. */
export async function submitRebuttal(input: z.input<typeof RebuttalInput>): Promise<ActionResult<{ response: GradeResponse }>> {
  const parsed = RebuttalInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { subject: subjectId, itemId, answer } = parsed.data;
  const subject = getSubject(subjectId);
  if (!subject?.active) return { ok: false, error: "Không tìm thấy môn học." };

  const user = await gate();
  if (typeof user === "string") return { ok: false, error: user };
  const found = findRebuttal(subject.id, subject.chapters.map((c) => c.number), itemId, user.role === "giang-vien");
  if (!found) return { ok: false, error: "Không tìm thấy luận điệu." };
  return gradeAndSave({
    user,
    subjectId: subject.id,
    chapter: found.bank.chapter,
    kind: "phan_bac",
    itemId,
    rubric: rebuttalRubric(found.item),
    answer,
    claim: found.item.claim,
    published: found.item.published,
  });
}

/** Câu hỏi vặn nhắm vào ý còn thiếu nặng nhất của một lượt chấm. Không còn ý thiếu thì trả `done`. */
export async function askFollowUp(attemptId: number): Promise<ActionResult<{ done: true } | { done: false; pointId: string; question: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Đồng chí cần đăng nhập." };
  const attempt = await getOwnAttempt(z.number().int().positive().parse(attemptId), user.visitorId);
  if (!attempt || attempt.kind === "hoi_vat") return { ok: false, error: "Không tìm thấy bài làm." };
  if (attempt.result.stance === "sai" || attempt.result.flagReason === "chen_lenh") {
    return { ok: false, error: "Bài làm này cần làm lại trước khi hỏi vặn." };
  }
  const pointId = weakestPoint(attempt.rubric, attempt.result);
  if (!pointId) return { ok: true, done: true };
  const point = attempt.rubric.points.find((p) => p.id === pointId)!;
  const subject = getSubject(attempt.subject)!;
  const question = await followUpQuestion(subject, attempt.rubric.prompt, point);
  return { ok: true, done: false, pointId, question };
}

const FollowUpInput = z.object({
  attemptId: z.number().int().positive(),
  pointId: z.string().max(32),
  question: z.string().trim().min(5).max(300),
  answer: answerSchema(MIN_FOLLOW_UP, MAX_FOLLOW_UP),
});

/** Chấm câu trả lời vấn đáp: barem chỉ gồm ý được hỏi, lấy từ lượt gốc trên máy chủ. */
export async function answerFollowUp(input: z.input<typeof FollowUpInput>): Promise<ActionResult<{ response: GradeResponse }>> {
  const parsed = FollowUpInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { attemptId, pointId, question, answer } = parsed.data;

  const user = await gate();
  if (typeof user === "string") return { ok: false, error: user };
  const parent = await getOwnAttempt(attemptId, user.visitorId);
  const point = parent?.rubric.points.find((p) => p.id === pointId);
  if (!parent || !point) return { ok: false, error: "Không tìm thấy câu hỏi vặn." };
  return gradeAndSave({
    user,
    subjectId: parent.subject,
    chapter: parent.chapter,
    kind: "hoi_vat",
    itemId: point.id,
    parentId: parent.id,
    rubric: { prompt: question, points: [point] },
    answer,
    question,
  });
}
