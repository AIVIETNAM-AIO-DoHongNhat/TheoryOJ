"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSubject } from "@/config/subjects";
import { getSubjectQuestions } from "@/features/question-bank/server/questions";
import { normalizeClassName } from "@/features/roster/normalize";
import type { ActionResult } from "@/lib/action-result";
import { requireTeacher } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

import { examKey, type ExamQuestion, REVEALS } from "./logic";
import { attemptCount, getExam, questionsOf } from "./server/exams";

const { exams, examAttempts } = schema;

const ExamInput = z
  .object({
    id: z.number().int().positive().nullable(),
    subject: z.string().max(32),
    title: z.string().trim().min(3, "Tên đề quá ngắn.").max(200, "Tên đề quá dài."),
    description: z.string().trim().max(2000, "Hướng dẫn quá dài.").default(""),
    questionKeys: z.array(z.string().max(80)).min(1, "Đề cần ít nhất một câu.").max(200, "Đề tối đa 200 câu."),
    durationMin: z.number().int().min(1, "Thời gian làm bài ít nhất 1 phút.").max(600, "Thời gian làm bài tối đa 600 phút."),
    opensAt: z.iso.datetime().nullable(),
    closesAt: z.iso.datetime().nullable(),
    classes: z.array(z.string().trim().min(1).max(64)).max(100),
    maxAttempts: z.number().int().min(1).max(10),
    shuffle: z.boolean(),
    reveal: z.enum(REVEALS),
    status: z.enum(["nhap", "da-giao"]),
  })
  .refine((v) => !v.opensAt || !v.closesAt || new Date(v.closesAt) > new Date(v.opensAt), {
    message: "Giờ đóng đề phải sau giờ mở đề.",
    path: ["closesAt"],
  })
  .refine((v) => new Set(v.questionKeys).size === v.questionKeys.length, { message: "Có câu bị chọn hai lần.", path: ["questionKeys"] });

export type ExamInput = z.input<typeof ExamInput>;

function refresh(id?: number) {
  revalidatePath("/quan-tri/de-thi", "layout");
  revalidatePath("/de-thi", "layout");
  if (id) revalidatePath(`/de-thi/${id}`);
}

/**
 * Tạo hoặc sửa đề. Câu hỏi chép từ ngân hàng hiện tại vào đề; câu đã bị xóa khỏi ngân hàng thì giữ bản chép cũ.
 * Đề đã có người làm thì giữ nguyên câu hỏi và cách trộn, chỉ đổi tên, thời gian, lớp, cách xem đáp án.
 */
export async function saveExam(input: ExamInput): Promise<ActionResult<{ id: number }>> {
  const user = await requireTeacher();
  const parsed = ExamInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Đề chưa hợp lệ." };
  const v = parsed.data;
  if (!getSubject(v.subject)?.active) return { ok: false, error: "Môn chưa mở." };

  const old = v.id ? await getExam(v.id) : null;
  if (v.id && !old) return { ok: false, error: "Không tìm thấy đề này, có thể đã bị xóa." };
  const locked = old ? (await attemptCount(old.id)) > 0 : false;

  let questions: ExamQuestion[];
  if (locked && old) {
    const before = questionsOf(old).map((q) => q.key);
    if (before.join("\n") !== v.questionKeys.join("\n") || old.shuffle !== v.shuffle || old.subject !== v.subject) {
      return { ok: false, error: "Đề đã có học viên làm nên không đổi câu hỏi, môn hay cách trộn được. Sao chép đề để soạn bản mới." };
    }
    questions = questionsOf(old);
  } else {
    const bank = new Map((await getSubjectQuestions(v.subject)).map((q) => [examKey(q.chapter, q.id), q]));
    const previous = new Map((old ? questionsOf(old) : []).map((q) => [q.key, q]));
    questions = [];
    for (const key of v.questionKeys) {
      const q = bank.get(key);
      if (q) questions.push({ key, chapter: q.chapter, code: q.id, q: q.q, options: q.options, answer: q.answer, explain: q.explain, page: q.page ?? null });
      else if (previous.has(key)) questions.push(previous.get(key)!);
      else return { ok: false, error: `Câu ${key} không còn trong ngân hàng câu hỏi.` };
    }
  }

  const values = {
    subject: v.subject,
    title: v.title,
    description: v.description,
    questions,
    durationMin: v.durationMin,
    opensAt: v.opensAt ? new Date(v.opensAt) : null,
    closesAt: v.closesAt ? new Date(v.closesAt) : null,
    classes: [...new Set(v.classes.map(normalizeClassName))],
    maxAttempts: v.maxAttempts,
    shuffle: v.shuffle,
    reveal: v.reveal,
    status: v.status,
  };

  let id: number;
  if (old) {
    await db.update(exams).set({ ...values, updatedAt: sql`now()` }).where(eq(exams.id, old.id));
    id = old.id;
  } else {
    const [row] = await db.insert(exams).values({ ...values, createdBy: user.id }).returning({ id: exams.id });
    id = row.id;
  }
  refresh(id);
  return { ok: true, id };
}

/** Giao đề cho học viên hoặc đưa về bản nháp (học viên không thấy nữa; bài đã nộp vẫn giữ). */
export async function setExamStatus(input: { id: number; status: "nhap" | "da-giao" }): Promise<ActionResult> {
  await requireTeacher();
  const { id, status } = z.object({ id: z.number().int().positive(), status: z.enum(["nhap", "da-giao"]) }).parse(input);
  const rows = await db.update(exams).set({ status, updatedAt: sql`now()` }).where(eq(exams.id, id)).returning({ id: exams.id });
  if (!rows.length) return { ok: false, error: "Không tìm thấy đề này." };
  refresh(id);
  return { ok: true };
}

/**
 * Đóng đề ngay: đặt giờ đóng là bây giờ. Bài đang làm được chấm theo phần đã lưu.
 * Đề chưa tới giờ mở thì kéo giờ mở về bây giờ, để giờ đóng không đứng trước giờ mở.
 */
export async function closeExamNow(id: number): Promise<ActionResult> {
  await requireTeacher();
  const examId = z.number().int().positive().parse(id);
  await db
    .update(exams)
    .set({
      closesAt: sql`now()`,
      opensAt: sql`case when ${exams.opensAt} > now() then now() else ${exams.opensAt} end`,
      updatedAt: sql`now()`,
    })
    .where(eq(exams.id, examId));
  refresh(examId);
  return { ok: true };
}

/** Bản sao ở trạng thái nháp, không kèm bài làm. Dùng để giao lại cho lớp khác hay sửa đề đã có người làm. */
export async function duplicateExam(id: number): Promise<ActionResult<{ id: number }>> {
  const user = await requireTeacher();
  const exam = await getExam(z.number().int().positive().parse(id));
  if (!exam) return { ok: false, error: "Không tìm thấy đề này." };
  const [row] = await db
    .insert(exams)
    .values({
      subject: exam.subject,
      title: `${exam.title} (bản sao)`,
      description: exam.description,
      questions: exam.questions,
      durationMin: exam.durationMin,
      opensAt: null,
      closesAt: null,
      classes: exam.classes,
      maxAttempts: exam.maxAttempts,
      shuffle: exam.shuffle,
      reveal: exam.reveal,
      status: "nhap",
      createdBy: user.id,
    })
    .returning({ id: exams.id });
  refresh();
  return { ok: true, id: row.id };
}

/** Xóa đề cùng mọi bài làm. */
export async function deleteExam(id: number): Promise<ActionResult> {
  await requireTeacher();
  const examId = z.number().int().positive().parse(id);
  await db.delete(exams).where(eq(exams.id, examId));
  refresh(examId);
  return { ok: true };
}

/** Cho một học viên làm lại: xóa mọi lượt của học viên đó trong đề. */
export async function resetStudentAttempts(input: { examId: number; userId: string }): Promise<ActionResult> {
  await requireTeacher();
  const { examId, userId } = z.object({ examId: z.number().int().positive(), userId: z.string().uuid() }).parse(input);
  await db.delete(examAttempts).where(and(eq(examAttempts.examId, examId), eq(examAttempts.userId, userId)));
  refresh(examId);
  return { ok: true };
}
