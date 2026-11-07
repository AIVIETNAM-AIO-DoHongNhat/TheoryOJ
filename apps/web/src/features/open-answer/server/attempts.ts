import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import type { Citation } from "@/features/chat/types";
import { db, schema } from "@/lib/db";

import type { AttemptKind, GradedRubric, GradeResult } from "../types";

const t = schema.openAnswerAttempts;

export async function saveOpenAttempt(input: {
  visitorId: string;
  userId: string | null;
  subject: string;
  chapter: number;
  kind: AttemptKind;
  itemId: string;
  parentId?: number | null;
  answer: string;
  rubric: GradedRubric;
  result: GradeResult;
  citations: Citation[];
  model: string;
  latencyMs: number;
}): Promise<number> {
  const [row] = await db
    .insert(t)
    .values({
      visitorId: input.visitorId,
      userId: input.userId,
      subject: input.subject,
      chapter: input.chapter,
      kind: input.kind,
      itemId: input.itemId,
      parentId: input.parentId ?? null,
      answer: input.answer,
      rubric: input.rubric,
      result: input.result,
      citations: input.citations,
      score: input.result.score,
      maxScore: input.result.maxScore,
      flagged: input.result.flagged,
      model: input.model,
      latencyMs: input.latencyMs,
    })
    .returning({ id: t.id });
  return row.id;
}

export interface StoredAttempt {
  id: number;
  subject: string;
  chapter: number;
  kind: AttemptKind;
  itemId: string;
  answer: string;
  rubric: GradedRubric;
  result: GradeResult;
  citations: Citation[];
  lecturerScore: number | null;
  lecturerNote: string | null;
  createdAt: Date;
}

const columns = {
  id: t.id,
  subject: t.subject,
  chapter: t.chapter,
  kind: t.kind,
  itemId: t.itemId,
  answer: t.answer,
  rubric: t.rubric,
  result: t.result,
  citations: t.citations,
  lecturerScore: t.lecturerScore,
  lecturerNote: t.lecturerNote,
  createdAt: t.createdAt,
};

/** Một lượt của đúng người làm. Người khác mở thì như không tồn tại. */
export async function getOwnAttempt(id: number, visitorId: string): Promise<StoredAttempt | null> {
  const [row] = await db.select(columns).from(t).where(and(eq(t.id, id), eq(t.visitorId, visitorId))).limit(1);
  return (row as StoredAttempt | undefined) ?? null;
}

/** Lượt gần nhất của từng câu (không tính hỏi vặn), để trang hiện lại kết quả cũ. */
export async function latestAttempts(visitorId: string, subject: string, kind: AttemptKind, itemIds: string[]): Promise<Map<string, StoredAttempt>> {
  if (itemIds.length === 0) return new Map();
  const rows = (await db
    .select(columns)
    .from(t)
    .where(and(eq(t.visitorId, visitorId), eq(t.subject, subject), eq(t.kind, kind), inArray(t.itemId, itemIds)))
    .orderBy(desc(t.createdAt))) as StoredAttempt[];
  const latest = new Map<string, StoredAttempt>();
  for (const r of rows) if (!latest.has(r.itemId)) latest.set(r.itemId, r);
  return latest;
}

export interface ChapterOpenSummary {
  chapter: number;
  kind: AttemptKind;
  attempts: number;
  /** Điểm cao nhất quy về thang 10. */
  best: number;
  items: number;
}

/** Tóm tắt tự luận và phản bác theo chương cho trang Tiến độ. */
export async function openAnswerSummary(visitorId: string, subject: string): Promise<ChapterOpenSummary[]> {
  const rows = await db
    .select({ chapter: t.chapter, kind: t.kind, itemId: t.itemId, score: t.score, maxScore: t.maxScore, lecturerScore: t.lecturerScore })
    .from(t)
    .where(and(eq(t.visitorId, visitorId), eq(t.subject, subject), inArray(t.kind, ["tu_luan", "phan_bac"])));
  const map = new Map<string, ChapterOpenSummary & { ids: Set<string> }>();
  for (const r of rows) {
    const key = `${r.chapter}|${r.kind}`;
    const s = map.get(key) ?? { chapter: r.chapter, kind: r.kind, attempts: 0, best: 0, items: 0, ids: new Set<string>() };
    const score = r.lecturerScore ?? r.score;
    s.attempts++;
    s.best = Math.max(s.best, r.maxScore ? (score / r.maxScore) * 10 : 0);
    s.ids.add(r.itemId);
    s.items = s.ids.size;
    map.set(key, s);
  }
  return [...map.values()]
    .map((s) => ({ chapter: s.chapter, kind: s.kind, attempts: s.attempts, items: s.items, best: Math.round(s.best * 4) / 4 }))
    .sort((a, b) => a.chapter - b.chapter || a.kind.localeCompare(b.kind));
}
