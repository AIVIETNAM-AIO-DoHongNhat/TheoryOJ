import "server-only";

import { sql } from "drizzle-orm";

import type { Citation } from "@/features/chat/types";
import { agreement, type Agreement, to10 } from "@/features/open-answer/agreement";
import type { AttemptKind, GradedRubric, GradeResult } from "@/features/open-answer/types";
import { db } from "@/lib/db";

// Truy vấn trang /quan-tri/cham-bai: bài tự luận, phản bác của học viên kèm điểm hệ thống chấm; giảng viên chấm lại
// để đo độ đồng thuận. Lượt hỏi vặn không liệt kê riêng (xem trong bài gốc). Lượt thử của giảng viên không tính số liệu.

export const GRADING_FILTERS = ["cho-cham", "gan-co", "da-cham", "tat-ca"] as const;
export type GradingFilter = (typeof GRADING_FILTERS)[number];

export const GRADING_FILTER_LABELS: Record<GradingFilter, string> = {
  "cho-cham": "Chờ giảng viên chấm",
  "gan-co": "Gắn cờ",
  "da-cham": "Đã chấm",
  "tat-ca": "Tất cả",
};

const KINDS: AttemptKind[] = ["tu_luan", "phan_bac"];
const PAGE_SIZE = 25;

const WHERE: Record<GradingFilter, ReturnType<typeof sql>> = {
  "cho-cham": sql`a.lecturer_score is null`,
  "gan-co": sql`a.flagged`,
  "da-cham": sql`a.lecturer_score is not null`,
  "tat-ca": sql`true`,
};

const BASE = sql`
  from open_answer_attempts a
  left join users u on u.visitor_id = a.visitor_id
  where a.kind in ('tu_luan', 'phan_bac') and coalesce(u.role, 'hoc-vien') = 'hoc-vien'`;

export interface GradedItem {
  id: number;
  createdAt: string;
  kind: AttemptKind;
  subject: string;
  chapter: number;
  itemId: string;
  prompt: string;
  score: number;
  maxScore: number;
  lecturerScore: number | null;
  flagged: boolean;
  flagReason: string | null;
  student: { code: string; name: string; className: string } | null;
}

function toItem(r: Record<string, unknown>): GradedItem {
  const rubric = r.rubric as GradedRubric;
  const result = r.result as GradeResult;
  return {
    id: Number(r.id),
    createdAt: new Date(String(r.created_at)).toISOString(),
    kind: r.kind as AttemptKind,
    subject: String(r.subject),
    chapter: Number(r.chapter),
    itemId: String(r.item_id),
    prompt: rubric.prompt,
    score: Number(r.score),
    maxScore: Number(r.max_score),
    lecturerScore: r.lecturer_score === null ? null : Number(r.lecturer_score),
    flagged: Boolean(r.flagged),
    flagReason: result.flagReason ?? null,
    student: r.student_code ? { code: String(r.student_code), name: String(r.full_name), className: String(r.class_name) } : null,
  };
}

export async function listGraded(opts: { filter: GradingFilter; kind: AttemptKind | null; page: number }) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select a.id, a.created_at, a.kind, a.subject, a.chapter, a.item_id, a.rubric, a.result, a.score, a.max_score,
           a.lecturer_score, a.flagged, u.student_code, u.full_name, u.class_name
    ${BASE} and ${WHERE[opts.filter]} ${opts.kind ? sql`and a.kind = ${opts.kind}` : sql``}
    order by a.flagged desc, a.created_at desc
    limit ${PAGE_SIZE + 1} offset ${(opts.page - 1) * PAGE_SIZE}`);
  return { items: rows.slice(0, PAGE_SIZE).map(toItem), hasMore: rows.length > PAGE_SIZE };
}

export async function gradingCounts(): Promise<Record<GradingFilter, number>> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select count(*) filter (where a.lecturer_score is null) as cho,
           count(*) filter (where a.flagged) as co,
           count(*) filter (where a.lecturer_score is not null) as da,
           count(*) as all
    ${BASE}`);
  return { "cho-cham": Number(r.cho), "gan-co": Number(r.co), "da-cham": Number(r.da), "tat-ca": Number(r.all) };
}

export interface GradedDetail extends GradedItem {
  answer: string;
  rubric: GradedRubric;
  result: GradeResult;
  citations: Citation[];
  lecturerNote: string | null;
  reviewedAt: string | null;
  reviewer: string | null;
  model: string | null;
  latencyMs: number | null;
  followUps: { id: number; question: string; answer: string; score: number; maxScore: number }[];
}

export async function getGraded(id: number): Promise<GradedDetail | null> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select a.*, u.student_code, u.full_name, u.class_name, rv.full_name as reviewer
    from open_answer_attempts a
    left join users u on u.visitor_id = a.visitor_id
    left join users rv on rv.id = a.reviewed_by
    where a.id = ${id} and a.kind in ('tu_luan', 'phan_bac')`);
  if (!r) return null;
  const follow = await db.execute<Record<string, unknown>>(sql`
    select id, answer, result, score, max_score from open_answer_attempts
    where parent_id = ${id} and kind = 'hoi_vat' order by created_at`);
  return {
    ...toItem(r),
    answer: String(r.answer),
    rubric: r.rubric as GradedRubric,
    result: r.result as GradeResult,
    citations: (r.citations as Citation[]) ?? [],
    lecturerNote: r.lecturer_note ? String(r.lecturer_note) : null,
    reviewedAt: r.reviewed_at ? new Date(String(r.reviewed_at)).toISOString() : null,
    reviewer: r.reviewer ? String(r.reviewer) : null,
    model: r.model ? String(r.model) : null,
    latencyMs: r.latency_ms === null ? null : Number(r.latency_ms),
    followUps: follow.map((f) => ({
      id: Number(f.id),
      question: (f.result as GradeResult).question ?? "",
      answer: String(f.answer),
      score: Number(f.score),
      maxScore: Number(f.max_score),
    })),
  };
}

export interface GradingOverview {
  attempts: number;
  students: number;
  /** Điểm hệ thống trung bình, thang 10. */
  avgScore: number | null;
  byKind: Record<string, Agreement>;
  all: Agreement;
}

/** Số lượt chấm và độ đồng thuận với giảng viên, tính trên các bài giảng viên đã chấm lại. */
export async function gradingOverview(): Promise<GradingOverview> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select a.kind, a.score, a.max_score, a.lecturer_score, a.visitor_id ${BASE}`);
  const pairsByKind: Record<string, { ai: number; lecturer: number }[]> = Object.fromEntries(KINDS.map((k) => [k, []]));
  let total = 0;
  for (const r of rows) {
    total += to10(Number(r.score), Number(r.max_score));
    if (r.lecturer_score !== null) {
      pairsByKind[String(r.kind)]?.push({
        ai: to10(Number(r.score), Number(r.max_score)),
        lecturer: to10(Number(r.lecturer_score), Number(r.max_score)),
      });
    }
  }
  return {
    attempts: rows.length,
    students: new Set(rows.map((r) => String(r.visitor_id))).size,
    avgScore: rows.length ? total / rows.length : null,
    byKind: Object.fromEntries(KINDS.map((k) => [k, agreement(pairsByKind[k])])),
    all: agreement(Object.values(pairsByKind).flat()),
  };
}

/** Ghi điểm giảng viên. Trả false nếu không có bài hoặc điểm vượt điểm tối đa của barem. */
export async function setLecturerScore(input: { id: number; score: number | null; note: string | null; reviewerId: string }): Promise<boolean> {
  const rows = await db.execute(sql`
    update open_answer_attempts
    set lecturer_score = ${input.score}, lecturer_note = ${input.note},
        reviewed_by = ${input.score === null ? null : input.reviewerId},
        reviewed_at = ${input.score === null ? null : sql`now()`}
    where id = ${input.id} and kind in ('tu_luan', 'phan_bac')
      and (${input.score}::real is null or ${input.score}::real <= max_score)
    returning id`);
  return rows.length > 0;
}
