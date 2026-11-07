import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";

import type { AttemptKind, GradedRubric, GradeResult, PublishedRebuttal, Submission } from "../types";

// Bài nộp của học viên (bảng open_answer_attempts). Bài vào hàng chờ của giảng viên phụ trách môn; trong lúc chờ,
// học viên sửa được bài (ghi đè bài đang chờ, không tạo bài mới). Đã chấm thì nộp lại là một bài mới.

const t = schema.openAnswerAttempts;

/**
 * Nộp bài: còn bài chờ chấm của cùng câu thì cập nhật bài đó, không thì tạo bài mới.
 * Barem chụp lại mỗi lần nộp, để giảng viên chấm theo đúng barem học viên đã làm.
 */
export async function submitAttempt(input: {
  visitorId: string;
  userId: string | null;
  subject: string;
  chapter: number;
  kind: AttemptKind;
  itemId: string;
  answer: string;
  rubric: GradedRubric;
  maxScore: number;
}): Promise<{ id: number; submittedAt: Date }> {
  const pending = and(
    eq(t.visitorId, input.visitorId), eq(t.subject, input.subject), eq(t.kind, input.kind), eq(t.itemId, input.itemId),
    isNull(t.gradedAt),
  );
  const [updated] = await db
    .update(t)
    .set({ answer: input.answer, rubric: input.rubric, maxScore: input.maxScore, chapter: input.chapter, submittedAt: new Date() })
    .where(pending)
    .returning({ id: t.id, submittedAt: t.submittedAt });
  if (updated) return updated;
  const [row] = await db
    .insert(t)
    .values({
      visitorId: input.visitorId,
      userId: input.userId,
      subject: input.subject,
      chapter: input.chapter,
      kind: input.kind,
      itemId: input.itemId,
      answer: input.answer,
      rubric: input.rubric,
      maxScore: input.maxScore,
    })
    .returning({ id: t.id, submittedAt: t.submittedAt });
  return row;
}

export interface StoredAttempt {
  id: number;
  itemId: string;
  answer: string;
  rubric: GradedRubric;
  result: GradeResult | null;
  score: number | null;
  maxScore: number;
  submittedAt: Date;
  gradedAt: Date | null;
  graderName: string | null;
}

/** Bài gần nhất của từng câu, để trang hiện lại bài đang chờ hoặc kết quả đã chấm. */
export async function latestAttempts(visitorId: string, subject: string, kind: AttemptKind, itemIds: string[]): Promise<Map<string, StoredAttempt>> {
  if (itemIds.length === 0) return new Map();
  const rows = (await db
    .select({
      id: t.id,
      itemId: t.itemId,
      answer: t.answer,
      rubric: t.rubric,
      result: t.result,
      score: t.score,
      maxScore: t.maxScore,
      submittedAt: t.submittedAt,
      gradedAt: t.gradedAt,
      graderName: schema.users.fullName,
    })
    .from(t)
    .leftJoin(schema.users, eq(schema.users.id, t.gradedBy))
    .where(and(eq(t.visitorId, visitorId), eq(t.subject, subject), eq(t.kind, kind), inArray(t.itemId, itemIds)))
    .orderBy(desc(t.submittedAt))) as StoredAttempt[];
  const latest = new Map<string, StoredAttempt>();
  for (const r of rows) if (!latest.has(r.itemId)) latest.set(r.itemId, r);
  return latest;
}

/** Bài đã lưu → dữ liệu gửi xuống trình duyệt. Barem, kết quả, nguồn phản bác chỉ gửi khi đã chấm. */
export function toSubmission(a: StoredAttempt, published?: PublishedRebuttal[]): Submission {
  const graded = a.gradedAt !== null && a.result !== null;
  return {
    attemptId: a.id,
    answer: a.answer,
    submittedAt: a.submittedAt.toISOString(),
    status: graded ? "da_cham" : "cho_cham",
    ...(graded
      ? { rubric: a.rubric, result: a.result!, gradedAt: a.gradedAt!.toISOString(), graderName: a.graderName, published }
      : {}),
  };
}

export interface ChapterOpenSummary {
  chapter: number;
  kind: AttemptKind;
  /** Số câu đã có bài được chấm. */
  graded: number;
  /** Số bài đang chờ chấm. */
  pending: number;
  /** Điểm cao nhất đã chấm, quy về thang 10; null nếu chưa có bài nào được chấm. */
  best: number | null;
}

/** Tóm tắt tự luận và phản bác theo chương cho trang Tiến độ. */
export async function openAnswerSummary(visitorId: string, subject: string): Promise<ChapterOpenSummary[]> {
  const rows = await db
    .select({ chapter: t.chapter, kind: t.kind, itemId: t.itemId, score: t.score, maxScore: t.maxScore, gradedAt: t.gradedAt })
    .from(t)
    .where(and(eq(t.visitorId, visitorId), eq(t.subject, subject)));
  const map = new Map<string, ChapterOpenSummary & { ids: Set<string> }>();
  for (const r of rows) {
    const key = `${r.chapter}|${r.kind}`;
    const s = map.get(key) ?? { chapter: r.chapter, kind: r.kind, graded: 0, pending: 0, best: null, ids: new Set<string>() };
    if (r.gradedAt && r.score !== null) {
      s.ids.add(r.itemId);
      s.graded = s.ids.size;
      s.best = Math.max(s.best ?? 0, r.maxScore ? (r.score / r.maxScore) * 10 : 0);
    } else {
      s.pending++;
    }
    map.set(key, s);
  }
  return [...map.values()]
    .map((s) => ({ chapter: s.chapter, kind: s.kind, graded: s.graded, pending: s.pending, best: s.best === null ? null : Math.round(s.best * 4) / 4 }))
    .sort((a, b) => a.chapter - b.chapter || a.kind.localeCompare(b.kind));
}
