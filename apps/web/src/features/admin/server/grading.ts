import "server-only";

import { type SQL, sql } from "drizzle-orm";

import type { AttemptKind, GradedRubric, GradeResult } from "@/features/open-answer/types";
import { db } from "@/lib/db";

// Truy vấn trang /quan-tri/cham-bai: hàng chờ bài tự luận, phản bác của học viên. Giảng viên chỉ thấy và chấm bài
// của môn mình phụ trách (users.subjects). Bài thử của tài khoản giảng viên không vào hàng chờ.

export const GRADING_FILTERS = ["cho-cham", "da-cham", "can-trao-doi", "tat-ca"] as const;
export type GradingFilter = (typeof GRADING_FILTERS)[number];

export const GRADING_FILTER_LABELS: Record<GradingFilter, string> = {
  "cho-cham": "Chờ chấm",
  "da-cham": "Đã chấm",
  "can-trao-doi": "Cần trao đổi",
  "tat-ca": "Tất cả",
};

const PAGE_SIZE = 25;

const WHERE: Record<GradingFilter, SQL> = {
  "cho-cham": sql`a.graded_at is null`,
  "da-cham": sql`a.graded_at is not null`,
  // Bài phản bác giảng viên đánh giá lập trường sai hoặc dao động.
  "can-trao-doi": sql`a.flagged`,
  "tat-ca": sql`true`,
};

/** Điều kiện chung: môn giảng viên phụ trách, chỉ bài của học viên (không phải bài thử của giảng viên). */
function scope(subjects: string[]): SQL {
  if (subjects.length === 0) return sql`false`;
  return sql`a.subject in (${sql.join(subjects.map((s) => sql`${s}`), sql`, `)}) and coalesce(u.role, 'hoc-vien') = 'hoc-vien'`;
}

const FROM = sql`from open_answer_attempts a left join users u on u.visitor_id = a.visitor_id`;

export interface GradedItem {
  id: number;
  submittedAt: string;
  kind: AttemptKind;
  subject: string;
  chapter: number;
  itemId: string;
  prompt: string;
  score: number | null;
  maxScore: number;
  gradedAt: string | null;
  flagged: boolean;
  student: { code: string; name: string; className: string } | null;
}

const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);

function toItem(r: Record<string, unknown>): GradedItem {
  return {
    id: Number(r.id),
    submittedAt: iso(r.submitted_at)!,
    kind: r.kind as AttemptKind,
    subject: String(r.subject),
    chapter: Number(r.chapter),
    itemId: String(r.item_id),
    prompt: (r.rubric as GradedRubric).prompt,
    score: r.score === null ? null : Number(r.score),
    maxScore: Number(r.max_score),
    gradedAt: iso(r.graded_at),
    flagged: Boolean(r.flagged),
    student: r.student_code ? { code: String(r.student_code), name: String(r.full_name), className: String(r.class_name) } : null,
  };
}

/** Bài chờ chấm xếp theo thời điểm nộp, cũ trước (ai nộp trước được chấm trước); các bộ lọc khác mới trước. */
export async function listGraded(opts: { filter: GradingFilter; kind: AttemptKind | null; page: number; subjects: string[] }) {
  const order = opts.filter === "cho-cham" ? sql`a.submitted_at asc` : sql`coalesce(a.graded_at, a.submitted_at) desc`;
  const rows = await db.execute<Record<string, unknown>>(sql`
    select a.id, a.submitted_at, a.kind, a.subject, a.chapter, a.item_id, a.rubric, a.score, a.max_score, a.graded_at, a.flagged,
           u.student_code, u.full_name, u.class_name
    ${FROM}
    where ${scope(opts.subjects)} and ${WHERE[opts.filter]} ${opts.kind ? sql`and a.kind = ${opts.kind}` : sql``}
    order by ${order}
    limit ${PAGE_SIZE + 1} offset ${(opts.page - 1) * PAGE_SIZE}`);
  return { items: rows.slice(0, PAGE_SIZE).map(toItem), hasMore: rows.length > PAGE_SIZE };
}

export async function gradingCounts(subjects: string[]): Promise<Record<GradingFilter, number>> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select count(*) filter (where a.graded_at is null) as cho,
           count(*) filter (where a.graded_at is not null) as da,
           count(*) filter (where a.flagged) as co,
           count(*) as all
    ${FROM} where ${scope(subjects)}`);
  return { "cho-cham": Number(r.cho), "da-cham": Number(r.da), "can-trao-doi": Number(r.co), "tat-ca": Number(r.all) };
}

/** Số bài đang chờ chấm, cho nhãn ở thanh bên quản trị. */
export async function pendingCount(subjects: string[]): Promise<number> {
  const [r] = await db.execute<{ n: number }>(sql`select count(*)::int as n ${FROM} where ${scope(subjects)} and a.graded_at is null`);
  return Number(r?.n ?? 0);
}

export interface GradedDetail extends GradedItem {
  answer: string;
  rubric: GradedRubric;
  result: GradeResult | null;
  grader: string | null;
}

/** Một bài, chỉ khi thuộc môn giảng viên phụ trách; ngoài phạm vi thì như không tồn tại. */
export async function getGraded(id: number, subjects: string[]): Promise<GradedDetail | null> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select a.*, u.student_code, u.full_name, u.class_name, g.full_name as grader
    ${FROM} left join users g on g.id = a.graded_by
    where a.id = ${id} and ${scope(subjects)}`);
  if (!r) return null;
  return {
    ...toItem(r),
    answer: String(r.answer),
    rubric: r.rubric as GradedRubric,
    result: (r.result as GradeResult | null) ?? null,
    grader: r.grader ? String(r.grader) : null,
  };
}

export interface GradingOverview {
  pending: number;
  /** Bài chấm trong 7 ngày qua. */
  gradedWeek: number;
  students: number;
  /** Điểm trung bình các bài đã chấm, thang 10. */
  avgScore: number | null;
  /** Thời gian chờ trung bình từ lúc nộp tới lúc được chấm, giờ, tính trên bài chấm trong 30 ngày. */
  avgWaitHours: number | null;
}

export async function gradingOverview(subjects: string[]): Promise<GradingOverview> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select count(*) filter (where a.graded_at is null) as pending,
           count(*) filter (where a.graded_at >= now() - interval '7 days') as week,
           count(distinct a.visitor_id) as students,
           avg(a.score / nullif(a.max_score, 0) * 10) filter (where a.graded_at is not null) as avg_score,
           avg(extract(epoch from a.graded_at - a.submitted_at) / 3600)
             filter (where a.graded_at >= now() - interval '30 days') as avg_wait
    ${FROM} where ${scope(subjects)}`);
  return {
    pending: Number(r.pending),
    gradedWeek: Number(r.week),
    students: Number(r.students),
    avgScore: r.avg_score === null ? null : Number(r.avg_score),
    avgWaitHours: r.avg_wait === null ? null : Number(r.avg_wait),
  };
}

/** Lưu kết quả chấm (chấm lần đầu hoặc chấm lại). Trả false nếu bài không còn hoặc ngoài môn phụ trách. */
export async function saveGrade(input: { id: number; subjects: string[]; graderId: string; result: GradeResult; flagged: boolean }): Promise<boolean> {
  if (input.subjects.length === 0) return false;
  const rows = await db.execute(sql`
    update open_answer_attempts
    set result = ${JSON.stringify(input.result)}::jsonb, score = ${input.result.score}, flagged = ${input.flagged},
        graded_by = ${input.graderId}, graded_at = now()
    where id = ${input.id} and subject in (${sql.join(input.subjects.map((s) => sql`${s}`), sql`, `)})
    returning id`);
  return rows.length > 0;
}
