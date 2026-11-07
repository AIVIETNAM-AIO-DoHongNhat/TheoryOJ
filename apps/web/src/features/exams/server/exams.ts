import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

import {
  answersVisible, classMatches, effectiveDeadline, examPhase, type ExamQuestion, grade, GRACE_MS, type LayoutItem, type Reveal,
} from "../logic";
import type {
  AttemptInfo, ExamDraft, ExamSummary, PaperQuestion, ReviewItem, StudentExamItem,
} from "../types";

const { exams, examAttempts, users } = schema;

type ExamRow = typeof exams.$inferSelect;
type AttemptRow = typeof examAttempts.$inferSelect;

export const questionsOf = (row: Pick<ExamRow, "questions">) => row.questions as ExamQuestion[];
export const layoutOf = (row: Pick<AttemptRow, "layout">) => row.layout as LayoutItem[];

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const attemptInfo = (a: AttemptRow): AttemptInfo => ({
  id: a.id,
  startedAt: a.startedAt.toISOString(),
  submittedAt: iso(a.submittedAt),
  score: a.score,
  total: a.total,
  autoSubmitted: a.autoSubmitted,
});

/**
 * Chấm các lượt đã hết giờ mà học viên chưa bấm nộp (đóng tab, mất mạng), theo đáp án đã lưu dần.
 * Không cần tiến trình chạy nền: trang học viên và trang kết quả gọi hàm này trước khi đọc.
 */
export async function finalizeExpired(filter: { examId?: number; userId?: string } = {}): Promise<void> {
  const rows = await db
    .select({ attempt: examAttempts, questions: exams.questions, closesAt: exams.closesAt })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(
      and(
        isNull(examAttempts.submittedAt),
        filter.examId ? eq(examAttempts.examId, filter.examId) : undefined,
        filter.userId ? eq(examAttempts.userId, filter.userId) : undefined,
        sql`least(${examAttempts.deadline}, coalesce(${exams.closesAt}, 'infinity'::timestamptz)) + make_interval(secs => ${GRACE_MS / 1000}) < now()`,
      ),
    );
  for (const { attempt, questions, closesAt } of rows) {
    const { score } = grade(questions as ExamQuestion[], attempt.answers);
    await db
      .update(examAttempts)
      .set({ submittedAt: effectiveDeadline(attempt.deadline, closesAt), score, autoSubmitted: true })
      .where(and(eq(examAttempts.id, attempt.id), isNull(examAttempts.submittedAt)));
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Giảng viên
// ---------------------------------------------------------------------------------------------------------------------

export async function listExams(): Promise<ExamSummary[]> {
  await finalizeExpired();
  const now = new Date();
  const rows = await db
    .select({
      exam: exams,
      submitted: sql<number>`(select count(distinct a.user_id) from exam_attempts a where a.exam_id = ${exams.id} and a.submitted_at is not null)`.mapWith(Number),
      inProgress: sql<number>`(select count(*) from exam_attempts a where a.exam_id = ${exams.id} and a.submitted_at is null)`.mapWith(Number),
      avgRatio: sql<number | null>`(select avg(best) from (select max(a.score::float / nullif(a.total, 0)) as best from exam_attempts a
        where a.exam_id = ${exams.id} and a.submitted_at is not null group by a.user_id) t)`,
    })
    .from(exams)
    .orderBy(desc(exams.createdAt));
  return rows.map(({ exam, submitted, inProgress, avgRatio }) => ({
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    questionCount: questionsOf(exam).length,
    durationMin: exam.durationMin,
    opensAt: iso(exam.opensAt),
    closesAt: iso(exam.closesAt),
    classes: exam.classes,
    status: exam.status,
    phase: examPhase(exam, now),
    submitted,
    inProgress,
    avgRatio: avgRatio === null ? null : Number(avgRatio),
    createdAt: exam.createdAt.toISOString(),
  }));
}

export async function getExam(id: number): Promise<ExamRow | null> {
  const [row] = await db.select().from(exams).where(eq(exams.id, id));
  return row ?? null;
}

export async function attemptCount(examId: number): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(examAttempts).where(eq(examAttempts.examId, examId));
  return row?.n ?? 0;
}

export async function getExamDraft(id: number): Promise<ExamDraft | null> {
  const exam = await getExam(id);
  if (!exam) return null;
  return {
    id: exam.id,
    subject: exam.subject,
    title: exam.title,
    description: exam.description,
    questionKeys: questionsOf(exam).map((q) => q.key),
    durationMin: exam.durationMin,
    opensAt: iso(exam.opensAt),
    closesAt: iso(exam.closesAt),
    classes: exam.classes,
    maxAttempts: exam.maxAttempts,
    shuffle: exam.shuffle,
    reveal: exam.reveal,
    status: exam.status,
    locked: (await attemptCount(id)) > 0,
  };
}

export interface StudentResult {
  userId: string;
  studentCode: string;
  fullName: string;
  className: string;
  /** Học viên không thuộc lớp được giao (đổi lớp sau khi làm bài). */
  outsideClasses: boolean;
  attempts: AttemptInfo[];
  best: { score: number; total: number } | null;
  inProgress: boolean;
}

export interface QuestionAnalysis {
  key: string;
  chapter: number;
  code: string;
  q: string;
  options: string[];
  answer: number;
  /** Số bài (lượt nộp đầu của mỗi học viên) có câu này, số làm đúng, số bỏ trống, số chọn từng phương án. */
  answered: number;
  correct: number;
  blank: number;
  picks: number[];
}

export interface ExamResults {
  exam: ExamRow;
  phase: ReturnType<typeof examPhase>;
  students: StudentResult[];
  questions: QuestionAnalysis[];
}

/** Kết quả một đề: mọi học viên được giao (kể cả chưa làm), các lượt, phân tích từng câu theo lượt nộp đầu. */
export async function getExamResults(id: number): Promise<ExamResults | null> {
  await finalizeExpired({ examId: id });
  const exam = await getExam(id);
  if (!exam) return null;

  const [assigned, attempts] = await Promise.all([
    db
      .select({ id: users.id, studentCode: users.studentCode, fullName: users.fullName, className: users.className })
      .from(users)
      .where(
        and(
          eq(users.role, "hoc-vien"),
          exam.classes.length
            ? sql`upper(trim(${users.className})) in (${sql.join(exam.classes.map((c) => sql`${c.trim().toUpperCase()}`), sql`, `)})`
            : undefined,
        ),
      )
      .orderBy(asc(users.className), asc(users.fullName)),
    db
      .select({ attempt: examAttempts, studentCode: users.studentCode, fullName: users.fullName, className: users.className })
      .from(examAttempts)
      .innerJoin(users, eq(users.id, examAttempts.userId))
      .where(eq(examAttempts.examId, id))
      .orderBy(asc(examAttempts.startedAt)),
  ]);

  const byUser = new Map<string, StudentResult>();
  for (const u of assigned) {
    byUser.set(u.id, { userId: u.id, studentCode: u.studentCode, fullName: u.fullName, className: u.className, outsideClasses: false, attempts: [], best: null, inProgress: false });
  }
  const firstSubmitted = new Map<string, AttemptRow>();
  for (const { attempt, ...u } of attempts) {
    let s = byUser.get(attempt.userId);
    if (!s) {
      s = { userId: attempt.userId, ...u, outsideClasses: true, attempts: [], best: null, inProgress: false };
      byUser.set(attempt.userId, s);
    }
    s.attempts.push(attemptInfo(attempt));
    if (!attempt.submittedAt) s.inProgress = true;
    else {
      if (!firstSubmitted.has(attempt.userId)) firstSubmitted.set(attempt.userId, attempt);
      const score = attempt.score ?? 0;
      if (!s.best || score / attempt.total > s.best.score / s.best.total) s.best = { score, total: attempt.total };
    }
  }

  const questions = questionsOf(exam).map<QuestionAnalysis>((q) => ({
    key: q.key, chapter: q.chapter, code: q.code, q: q.q, options: q.options, answer: q.answer,
    answered: 0, correct: 0, blank: 0, picks: q.options.map(() => 0),
  }));
  for (const attempt of firstSubmitted.values()) {
    const { items } = grade(questionsOf(exam), attempt.answers);
    items.forEach((item, i) => {
      const a = questions[i];
      a.answered++;
      if (item.chosen === null) a.blank++;
      else a.picks[item.chosen]++;
      if (item.correct) a.correct++;
    });
  }

  return { exam, phase: examPhase(exam, new Date()), students: [...byUser.values()], questions };
}

// ---------------------------------------------------------------------------------------------------------------------
// Học viên
// ---------------------------------------------------------------------------------------------------------------------

const visibleTo = (exam: ExamRow, user: CurrentUser) => exam.status === "da-giao" && classMatches(exam.classes, user.className);

/** Đề đã giao cho lớp của học viên, kèm số lượt đã làm và điểm cao nhất. */
export async function listStudentExams(user: CurrentUser): Promise<StudentExamItem[]> {
  await finalizeExpired({ userId: user.id });
  const now = new Date();
  const [rows, attempts] = await Promise.all([
    db.select().from(exams).where(eq(exams.status, "da-giao")).orderBy(desc(exams.createdAt)),
    db.select().from(examAttempts).where(eq(examAttempts.userId, user.id)),
  ]);
  return rows
    .filter((e) => visibleTo(e, user))
    .map((e) => {
      const own = attempts.filter((a) => a.examId === e.id);
      const done = own.filter((a) => a.submittedAt);
      const best = done.reduce<{ score: number; total: number } | null>(
        (b, a) => (!b || (a.score ?? 0) / a.total > b.score / b.total ? { score: a.score ?? 0, total: a.total } : b),
        null,
      );
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        subject: e.subject,
        questionCount: questionsOf(e).length,
        durationMin: e.durationMin,
        opensAt: iso(e.opensAt),
        closesAt: iso(e.closesAt),
        phase: examPhase(e, now),
        maxAttempts: e.maxAttempts,
        attemptsUsed: done.length,
        inProgress: own.some((a) => !a.submittedAt),
        best,
      };
    });
}

export interface StudentExamView {
  exam: {
    id: number;
    title: string;
    description: string;
    subject: string;
    questionCount: number;
    durationMin: number;
    opensAt: string | null;
    closesAt: string | null;
    maxAttempts: number;
    reveal: Reveal;
  };
  phase: ReturnType<typeof examPhase>;
  attempts: AttemptInfo[];
  /** Lượt đang làm: đề theo thứ tự của lượt, đáp án đã lưu, hạn nộp thật. */
  current: { attemptId: number; deadline: string; paper: PaperQuestion[]; answers: Record<string, number> } | null;
  /** Bài nộp gần nhất kèm đáp án, khi đề cho xem; null nếu chưa nộp hoặc đề chưa cho xem đáp án. */
  review: { attemptId: number; items: ReviewItem[] } | null;
  answersVisible: boolean;
  canStart: boolean;
  serverNow: string;
}

function paperOf(questions: ExamQuestion[], layout: LayoutItem[]): (PaperQuestion & { source: ExamQuestion })[] {
  const byKey = new Map(questions.map((q) => [q.key, q]));
  return layout.flatMap((l) => {
    const q = byKey.get(l.key);
    return q ? [{ key: q.key, q: q.q, options: l.options.map((k) => ({ key: k, text: q.options[k] })), source: q }] : [];
  });
}

/** Một đề của học viên: thông tin, bài đang làm, bài đã nộp. Null nếu đề không giao cho học viên này. */
export async function getStudentExam(user: CurrentUser, id: number): Promise<StudentExamView | null> {
  await finalizeExpired({ userId: user.id, examId: id });
  const exam = await getExam(id);
  if (!exam || !visibleTo(exam, user)) return null;
  const now = new Date();
  const attempts = await db
    .select()
    .from(examAttempts)
    .where(and(eq(examAttempts.examId, id), eq(examAttempts.userId, user.id)))
    .orderBy(asc(examAttempts.startedAt));

  const questions = questionsOf(exam);
  const open = attempts.find((a) => !a.submittedAt);
  const submitted = attempts.filter((a) => a.submittedAt);
  const last = submitted.at(-1);
  const visible = answersVisible(exam, now);
  const phase = examPhase(exam, now);

  let review: StudentExamView["review"] = null;
  if (last && visible) {
    const graded = new Map(grade(questions, last.answers).items.map((i) => [i.key, i]));
    review = {
      attemptId: last.id,
      items: paperOf(questions, layoutOf(last)).map(({ source, ...p }) => {
        const g = graded.get(p.key)!;
        return { ...p, chapter: source.chapter, chosen: g.chosen, answer: g.answer, correct: g.correct, explain: source.explain, page: source.page };
      }),
    };
  }

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      questionCount: questions.length,
      durationMin: exam.durationMin,
      opensAt: iso(exam.opensAt),
      closesAt: iso(exam.closesAt),
      maxAttempts: exam.maxAttempts,
      reveal: exam.reveal,
    },
    phase,
    attempts: attempts.map(attemptInfo),
    current: open
      ? {
          attemptId: open.id,
          deadline: effectiveDeadline(open.deadline, exam.closesAt).toISOString(),
          paper: paperOf(questions, layoutOf(open)).map((p) => ({ key: p.key, q: p.q, options: p.options })),
          answers: open.answers,
        }
      : null,
    review,
    answersVisible: visible,
    canStart: !open && phase === "dang-mo" && submitted.length < exam.maxAttempts,
    serverNow: now.toISOString(),
  };
}
