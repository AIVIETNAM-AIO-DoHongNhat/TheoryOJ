import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getSubject, type Subject } from "@/config/subjects";
import { getContentBank, loadBankEdits } from "@/features/quiz/server/bank";
import { mergeBank } from "@/features/quiz/merge";
import { db, schema } from "@/lib/db";

import type { AdminQuestion, ChapterBankSummary } from "../types";

/** Môn đang mở và chương hợp lệ, hoặc null. Server Action và trang quản trị đều kiểm tra trước khi đọc, ghi. */
export function resolveChapter(subjectId: string, chapter: number): { subject: Subject; chapter: number } | null {
  const subject = getSubject(subjectId);
  if (!subject?.active || !subject.chapters.some((c) => c.number === chapter)) return null;
  return { subject, chapter };
}

/** Tỷ lệ làm đúng từng câu trong các lượt trắc nghiệm ôn tập của chương. */
async function practiceStats(subject: string, chapter: number): Promise<Map<string, { attempts: number; correct: number }>> {
  const rows = await db.execute<{ id: string; attempts: unknown; correct: unknown }>(sql`
    select item->>'id' as id, count(*) as attempts, count(*) filter (where (item->>'correct')::boolean) as correct
    from practice_attempts,
      jsonb_array_elements(case when jsonb_typeof(details) = 'array' then details else '[]'::jsonb end) as item
    where subject = ${subject} and chapter = ${chapter} and kind = 'quiz'
    group by 1`);
  return new Map(rows.map((r) => [r.id, { attempts: Number(r.attempts), correct: Number(r.correct) }]));
}

/** Toàn bộ câu của một chương cho trang quản trị: câu trong file, câu đã sửa, câu đã ẩn và câu giảng viên soạn. */
export async function getAdminChapter(subject: string, chapter: number): Promise<{ questions: AdminQuestion[]; reviewed: boolean }> {
  const content = getContentBank(subject, chapter);
  const [rows, stats, review] = await Promise.all([
    db
      .select({
        code: schema.quizQuestions.code,
        q: schema.quizQuestions.q,
        options: schema.quizQuestions.options,
        answer: schema.quizQuestions.answer,
        explain: schema.quizQuestions.explain,
        page: schema.quizQuestions.page,
        hidden: schema.quizQuestions.hidden,
        examOnly: schema.quizQuestions.examOnly,
        updatedAt: schema.quizQuestions.updatedAt,
        updatedBy: schema.users.fullName,
      })
      .from(schema.quizQuestions)
      .leftJoin(schema.users, eq(schema.users.id, schema.quizQuestions.updatedBy))
      .where(and(eq(schema.quizQuestions.subject, subject), eq(schema.quizQuestions.chapter, chapter)))
      .orderBy(schema.quizQuestions.id),
    practiceStats(subject, chapter),
    db
      .select({ reviewed: schema.quizChapterReviews.reviewed })
      .from(schema.quizChapterReviews)
      .where(and(eq(schema.quizChapterReviews.subject, subject), eq(schema.quizChapterReviews.chapter, chapter))),
  ]);

  const byCode = new Map(rows.map((r) => [r.code, r]));
  const meta = (code: string) => {
    const r = byCode.get(code);
    const s = stats.get(code);
    return {
      updatedAt: r?.updatedAt.toISOString() ?? null,
      updatedBy: r?.updatedBy ?? null,
      attempts: s?.attempts ?? 0,
      correctRate: s?.attempts ? s.correct / s.attempts : null,
    };
  };

  const questions: AdminQuestion[] = [];
  for (const q of content?.questions ?? []) {
    const r = byCode.get(q.id);
    byCode.delete(q.id);
    const edited = r && (r.q !== q.q || r.explain !== q.explain || r.answer !== q.answer || (r.page ?? undefined) !== q.page
      || JSON.stringify(r.options) !== JSON.stringify(q.options));
    const current = r ? { q: r.q, options: r.options, answer: r.answer, explain: r.explain, page: r.page } : { ...q, page: q.page ?? null };
    questions.push({
      code: q.id,
      ...current,
      source: edited ? "da-sua" : "goc",
      hidden: r?.hidden ?? false,
      examOnly: r?.examOnly ?? false,
      original: edited ? { q: q.q, options: q.options, answer: q.answer, explain: q.explain, page: q.page ?? null } : null,
      ...meta(q.id),
    });
  }
  for (const r of byCode.values()) {
    questions.push({
      code: r.code,
      q: r.q,
      options: r.options,
      answer: r.answer,
      explain: r.explain,
      page: r.page,
      source: "moi",
      hidden: r.hidden,
      examOnly: r.examOnly,
      original: null,
      ...meta(r.code),
    });
  }
  return { questions, reviewed: review[0]?.reviewed ?? content?.reviewed ?? false };
}

/** Số câu theo chương cho thanh chọn chương. */
export async function getChapterSummaries(subject: Subject): Promise<ChapterBankSummary[]> {
  const edits = await loadBankEdits(subject.id);
  return subject.chapters.map((c) => {
    const bank = mergeBank(subject.id, c.number, getContentBank(subject.id, c.number), edits);
    const rows = edits.questions.filter((e) => e.chapter === c.number);
    const contentIds = new Set(getContentBank(subject.id, c.number)?.questions.map((q) => q.id));
    return {
      chapter: c.number,
      title: c.title,
      visible: bank?.questions.length ?? 0,
      added: rows.filter((r) => !contentIds.has(r.code)).length,
      hidden: rows.filter((r) => r.hidden).length,
      reviewed: bank?.reviewed ?? false,
    };
  });
}

/** Câu dùng được cho đề thi của cả môn (đã ghép, bỏ câu ẩn, giữ câu chỉ dùng cho đề thi), đọc thẳng DB. Dùng cho bộ chọn câu của đề thi. */
export async function getSubjectQuestions(subjectId: string) {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  const edits = await loadBankEdits(subjectId);
  return subject.chapters.flatMap((c) =>
    (mergeBank(subjectId, c.number, getContentBank(subjectId, c.number), edits, "exam")?.questions ?? []).map((q) => ({ ...q, chapter: c.number })),
  );
}
