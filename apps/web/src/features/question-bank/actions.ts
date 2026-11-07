"use server";

import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { getContentBank, QUIZ_BANK_TAG } from "@/features/quiz/server/bank";
import type { ActionResult } from "@/lib/action-result";
import { requireTeacher } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

import { firstIssue, parseQuestionText, QuestionInput } from "./schema";
import { resolveChapter } from "./server/questions";

const PATH = "/quan-tri/cau-hoi";

const Where = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
});
const Code = z.string().min(1).max(32);

async function guard(input: unknown) {
  const user = await requireTeacher();
  const { subject, chapter } = Where.parse(input);
  const scope = resolveChapter(subject, chapter);
  if (!scope) throw new Error("Không có môn hoặc chương này.");
  return { user, subject, chapter };
}

/** Làm mới mọi trang dùng ngân hàng câu hỏi: trang ôn tập của học viên (qua tag) và trang quản trị. */
function refresh() {
  updateTag(QUIZ_BANK_TAG);
  revalidatePath(PATH);
}

/** Mã câu mới: 8 ký tự hex (32 bit) để lần nhập vài trăm câu không vấp trùng mã. */
const newCode = (chapter: number) => `gv${chapter}-${randomBytes(4).toString("hex")}`;

/**
 * Thêm câu mới (không có `code`) hoặc lưu bản sửa của một câu. Sửa câu trong file thì lưu thành bản thay thế cùng mã.
 * `examOnly` chỉ áp cho câu mới; câu đã có đổi bằng setQuestionExamOnly.
 */
export async function saveQuestion(input: {
  subject: string;
  chapter: number;
  code: string | null;
  question: z.input<typeof QuestionInput>;
  examOnly?: boolean;
}): Promise<ActionResult<{ code: string }>> {
  const { user, subject, chapter } = await guard(input);
  const code = input.code === null ? null : Code.parse(input.code);
  const parsed = QuestionInput.safeParse(input.question);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const q = parsed.data;

  if (code === null) {
    const created = newCode(chapter);
    const examOnly = z.boolean().default(false).parse(input.examOnly);
    await db.insert(schema.quizQuestions).values({ subject, chapter, code: created, ...q, examOnly, updatedBy: user.id });
    refresh();
    return { ok: true, code: created };
  }

  const inContent = getContentBank(subject, chapter)?.questions.some((x) => x.id === code);
  const [existing] = await db
    .select({ id: schema.quizQuestions.id })
    .from(schema.quizQuestions)
    .where(and(eq(schema.quizQuestions.subject, subject), eq(schema.quizQuestions.chapter, chapter), eq(schema.quizQuestions.code, code)));
  if (!existing && !inContent) return { ok: false, error: "Không tìm thấy câu này, có thể đã bị xóa." };

  await db
    .insert(schema.quizQuestions)
    .values({ subject, chapter, code, ...q, updatedBy: user.id })
    .onConflictDoUpdate({
      target: [schema.quizQuestions.subject, schema.quizQuestions.chapter, schema.quizQuestions.code],
      set: { ...q, updatedBy: user.id, updatedAt: sql`now()` },
    });
  refresh();
  return { ok: true, code };
}

/** Đặt cờ `hidden` hoặc `examOnly` của một câu. Câu trong file chưa sửa thì chép nội dung gốc vào bảng. */
async function setFlag(
  input: { subject: string; chapter: number; code: string },
  flag: { hidden: boolean } | { examOnly: boolean },
): Promise<ActionResult> {
  const { user, subject, chapter } = await guard(input);
  const code = Code.parse(input.code);
  const match = and(eq(schema.quizQuestions.subject, subject), eq(schema.quizQuestions.chapter, chapter), eq(schema.quizQuestions.code, code));

  const updated = await db
    .update(schema.quizQuestions)
    .set({ ...flag, updatedBy: user.id, updatedAt: sql`now()` })
    .where(match)
    .returning({ id: schema.quizQuestions.id });
  if (!updated.length) {
    const original = getContentBank(subject, chapter)?.questions.find((x) => x.id === code);
    if (!original) return { ok: false, error: "Không tìm thấy câu này." };
    await db.insert(schema.quizQuestions).values({
      subject, chapter, code, q: original.q, options: original.options, answer: original.answer,
      explain: original.explain, page: original.page ?? null, ...flag, updatedBy: user.id,
    });
  }
  refresh();
  return { ok: true };
}

/** Ẩn câu khỏi trắc nghiệm của học viên và bộ chọn câu đề thi (hoặc hiện lại). */
export async function setQuestionHidden(input: { subject: string; chapter: number; code: string; hidden: boolean }): Promise<ActionResult> {
  return setFlag(input, { hidden: z.boolean().parse(input.hidden) });
}

/**
 * Chỉ dùng câu cho đề thi (hoặc cho ôn tập trở lại). Câu chỉ dùng cho đề thi không hiện ở trắc nghiệm ôn tập,
 * để học viên không xem trước được câu và đáp án của đề. Đề đã lưu giữ nguyên bản chép của câu.
 */
export async function setQuestionExamOnly(input: { subject: string; chapter: number; code: string; examOnly: boolean }): Promise<ActionResult> {
  return setFlag(input, { examOnly: z.boolean().parse(input.examOnly) });
}

/** Bỏ bản sửa (và trạng thái ẩn) của một câu trong file, dùng lại nội dung gốc. */
export async function restoreQuestion(input: { subject: string; chapter: number; code: string }): Promise<ActionResult> {
  const { subject, chapter } = await guard(input);
  const code = Code.parse(input.code);
  if (!getContentBank(subject, chapter)?.questions.some((x) => x.id === code)) {
    return { ok: false, error: "Câu do giảng viên soạn không có bản gốc để khôi phục." };
  }
  await db
    .delete(schema.quizQuestions)
    .where(and(eq(schema.quizQuestions.subject, subject), eq(schema.quizQuestions.chapter, chapter), eq(schema.quizQuestions.code, code)));
  refresh();
  return { ok: true };
}

/** Xóa hẳn câu giảng viên soạn. Câu trong file chỉ ẩn được, không xóa. Đề thi đã lưu giữ nguyên bản chép của câu. */
export async function deleteQuestion(input: { subject: string; chapter: number; code: string }): Promise<ActionResult> {
  const { subject, chapter } = await guard(input);
  const code = Code.parse(input.code);
  if (getContentBank(subject, chapter)?.questions.some((x) => x.id === code)) {
    return { ok: false, error: "Câu trong giáo trình gốc chỉ ẩn được, không xóa." };
  }
  await db
    .delete(schema.quizQuestions)
    .where(and(eq(schema.quizQuestions.subject, subject), eq(schema.quizQuestions.chapter, chapter), eq(schema.quizQuestions.code, code)));
  refresh();
  return { ok: true };
}

/** Nhập nhiều câu từ văn bản dán vào. Máy chủ đọc lại văn bản; còn câu lỗi thì không nhập câu nào. */
export async function importQuestions(input: { subject: string; chapter: number; text: string; examOnly?: boolean }): Promise<ActionResult<{ count: number }>> {
  const { user, subject, chapter } = await guard(input);
  const text = z.string().max(200_000, "Văn bản quá dài, chia thành nhiều lần nhập.").parse(input.text);
  const examOnly = z.boolean().default(false).parse(input.examOnly);
  const parsed = parseQuestionText(text);
  if (parsed.length === 0) return { ok: false, error: "Không đọc được câu nào." };
  if (parsed.length > 300) return { ok: false, error: "Mỗi lần nhập tối đa 300 câu." };
  const bad = parsed.find((p) => !p.data);
  if (bad) return { ok: false, error: `Câu ${bad.index} (dòng ${bad.line}): ${bad.error}` };

  await db.insert(schema.quizQuestions).values(
    parsed.map((p) => ({ subject, chapter, code: newCode(chapter), ...p.data!, examOnly, updatedBy: user.id })),
  );
  refresh();
  return { ok: true, count: parsed.length };
}

/** Đánh dấu bộ câu của chương đã duyệt (bỏ nhãn "chờ duyệt" ở trang học viên) hoặc bỏ duyệt. */
export async function setChapterReviewed(input: { subject: string; chapter: number; reviewed: boolean }): Promise<ActionResult> {
  const { user, subject, chapter } = await guard(input);
  const reviewed = z.boolean().parse(input.reviewed);
  await db
    .insert(schema.quizChapterReviews)
    .values({ subject, chapter, reviewed, updatedBy: user.id })
    .onConflictDoUpdate({
      target: [schema.quizChapterReviews.subject, schema.quizChapterReviews.chapter],
      set: { reviewed, updatedBy: user.id, updatedAt: sql`now()` },
    });
  refresh();
  return { ok: true };
}
