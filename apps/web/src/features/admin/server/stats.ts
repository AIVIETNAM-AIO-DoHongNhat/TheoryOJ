import "server-only";

import { sql } from "drizzle-orm";

import { PASS_RATIO } from "@/features/quiz/types";
import { MASTERED_DAYS } from "@/features/flashcards/schedule";
import { db } from "@/lib/db";

// Số liệu cho trang quản trị. Dữ liệu học tập gắn với mã khách; nối sang tài khoản qua users.visitor_id,
// nên số liệu theo lớp chỉ tính học viên đã đăng ký tài khoản.

const num = (v: unknown) => Number(v ?? 0);
const ratio = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export interface Overview {
  accounts: number;
  active7: number;
  questions7: number;
  quizzes7: number;
  cardReviews7: number;
  helpful: number | null;
  ratings: number;
  /** Tin nhắn cần giảng viên xem: gắn cờ hoặc bị 👎, chưa đánh dấu đã xem. */
  toReview: number;
  refused7: number;
}

export async function getOverview(): Promise<Overview> {
  const [r] = await db.execute<Record<string, unknown>>(sql`
    select
      (select count(*) from users where role = 'hoc-vien') as accounts,
      (select count(distinct v) from (
         select visitor_id as v from practice_attempts where created_at > now() - interval '7 days'
         union select visitor_id from conversations where updated_at > now() - interval '7 days'
         union select visitor_id from flashcard_states where last_reviewed_at > now() - interval '7 days'
       ) a) as active7,
      (select count(*) from messages where role = 'assistant' and created_at > now() - interval '7 days') as questions7,
      (select count(*) from messages where role = 'assistant' and refused is not null and created_at > now() - interval '7 days') as refused7,
      (select count(*) from practice_attempts where kind = 'quiz' and created_at > now() - interval '7 days') as quizzes7,
      (select count(*) from flashcard_states where last_reviewed_at > now() - interval '7 days') as card_reviews7,
      (select count(*) from feedback) as ratings,
      (select avg(case when rating = 1 then 1.0 else 0 end) from feedback) as helpful,
      (select count(*) from messages m where m.role = 'assistant' and m.reviewed_at is null
         and (m.flagged or exists (select 1 from feedback f where f.message_id = m.id and f.rating = -1))) as to_review`);
  return {
    accounts: num(r.accounts),
    active7: num(r.active7),
    questions7: num(r.questions7),
    quizzes7: num(r.quizzes7),
    cardReviews7: num(r.card_reviews7),
    helpful: ratio(r.helpful),
    ratings: num(r.ratings),
    toReview: num(r.to_review),
    refused7: num(r.refused7),
  };
}

export interface DayActivity {
  /** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD. */
  day: string;
  questions: number;
  quizzes: number;
}

/** Số câu hỏi trợ lý và lượt trắc nghiệm mỗi ngày trong `days` ngày gần nhất (tính cả hôm nay, giờ Việt Nam). */
export async function getDailyActivity(days = 14): Promise<DayActivity[]> {
  const rows = await db.execute<{ day: string; questions: unknown; quizzes: unknown }>(sql`
    with d as (
      select generate_series(
        (now() at time zone 'Asia/Ho_Chi_Minh')::date - ${days - 1}::int,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date,
        interval '1 day')::date as day
    ),
    q as (
      select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*) as n from messages
      where role = 'assistant' and created_at > now() - make_interval(days => ${days + 1}::int) group by 1
    ),
    p as (
      select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*) as n from practice_attempts
      where kind = 'quiz' and created_at > now() - make_interval(days => ${days + 1}::int) group by 1
    )
    select d.day::text as day, coalesce(q.n, 0) as questions, coalesce(p.n, 0) as quizzes
    from d left join q using (day) left join p using (day) order by d.day`);
  return rows.map((r) => ({ day: String(r.day), questions: num(r.questions), quizzes: num(r.quizzes) }));
}

export interface ClassInfo {
  name: string;
  students: number;
}

export async function getClasses(): Promise<ClassInfo[]> {
  const rows = await db.execute<{ name: string; students: unknown }>(sql`
    select class_name as name, count(*) as students from users where role = 'hoc-vien'
    group by class_name order by class_name`);
  return rows.map((r) => ({ name: r.name, students: num(r.students) }));
}

export interface ChapterStat {
  chapter: number;
  /** Số người đã làm trắc nghiệm chương này. */
  people: number;
  /** Tỷ lệ đúng trung bình của lượt đầu và của lượt cao nhất mỗi người, 0–1. */
  firstAvg: number | null;
  bestAvg: number | null;
  /** Tỷ lệ người đạt (lượt cao nhất từ PASS_RATIO). */
  passRate: number | null;
  /** Số người đã ôn thẻ và số thẻ đã thuộc bình quân mỗi người. */
  cardPeople: number;
  masteredAvg: number | null;
}

/** Thống kê theo chương của một môn, cho cả Học viện hoặc một lớp (chỉ học viên có tài khoản). */
export async function getChapterStats(subject: string, className: string | null): Promise<ChapterStat[]> {
  const scope = className
    ? sql`and visitor_id in (select visitor_id from users where role = 'hoc-vien' and class_name = ${className})`
    : sql``;
  const [quiz, cards] = await Promise.all([
    db.execute<Record<string, unknown>>(sql`
      with a as (
        select visitor_id, chapter, score::float / nullif(total, 0) as r,
               row_number() over (partition by visitor_id, chapter order by created_at) as k
        from practice_attempts where kind = 'quiz' and subject = ${subject} ${scope}
      ), p as (
        select visitor_id, chapter, max(r) as best, max(r) filter (where k = 1) as first from a group by visitor_id, chapter
      )
      select chapter, count(*) as people, avg(first) as first_avg, avg(best) as best_avg,
             avg(case when best >= ${PASS_RATIO} then 1.0 else 0 end) as pass_rate
      from p group by chapter`),
    db.execute<Record<string, unknown>>(sql`
      select chapter, count(distinct visitor_id) as people,
             count(*) filter (where interval_days >= ${MASTERED_DAYS})::float / count(distinct visitor_id) as mastered_avg
      from flashcard_states where subject = ${subject} ${scope} group by chapter`),
  ]);
  const chapters = new Set([...quiz, ...cards].map((r) => num(r.chapter)));
  return [...chapters].sort((a, b) => a - b).map((chapter) => {
    const q = quiz.find((r) => num(r.chapter) === chapter);
    const c = cards.find((r) => num(r.chapter) === chapter);
    return {
      chapter,
      people: num(q?.people),
      firstAvg: ratio(q?.first_avg),
      bestAvg: ratio(q?.best_avg),
      passRate: ratio(q?.pass_rate),
      cardPeople: num(c?.people),
      masteredAvg: ratio(c?.mastered_avg),
    };
  });
}

export interface StudentRow {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  createdAt: Date;
  lastActive: Date | null;
  quizzes: number;
  /** Số chương đạt và điểm trung bình của lượt cao nhất mỗi chương đã làm, 0–1. */
  chaptersPassed: number;
  bestAvg: number | null;
  cardsMastered: number;
  questions: number;
}

export async function getStudents(opts: { q?: string; className?: string | null }): Promise<StudentRow[]> {
  const q = opts.q?.trim();
  const rows = await db.execute<Record<string, unknown>>(sql`
    with best as (
      select visitor_id, chapter, max(score::float / nullif(total, 0)) as best
      from practice_attempts where kind = 'quiz' group by visitor_id, subject, chapter
    )
    select u.id, u.student_code, u.full_name, u.class_name, u.created_at,
      greatest(u.last_login_at,
        (select max(created_at) from practice_attempts p where p.visitor_id = u.visitor_id),
        (select max(last_reviewed_at) from flashcard_states s where s.visitor_id = u.visitor_id),
        (select max(updated_at) from conversations c where c.visitor_id = u.visitor_id)) as last_active,
      (select count(*) from practice_attempts p where p.visitor_id = u.visitor_id and p.kind = 'quiz') as quizzes,
      (select count(*) from best b where b.visitor_id = u.visitor_id and b.best >= ${PASS_RATIO}) as passed,
      (select avg(best) from best b where b.visitor_id = u.visitor_id) as best_avg,
      (select count(*) from flashcard_states s where s.visitor_id = u.visitor_id and s.interval_days >= ${MASTERED_DAYS}) as mastered,
      (select count(*) from messages m join conversations c on c.id = m.conversation_id
        where c.visitor_id = u.visitor_id and m.role = 'user') as questions
    from users u
    where u.role = 'hoc-vien'
      ${opts.className ? sql`and u.class_name = ${opts.className}` : sql``}
      ${q ? sql`and (u.student_code ilike ${`%${q}%`} or u.full_name ilike ${`%${q}%`})` : sql``}
    order by u.class_name, u.student_code
    limit 500`);
  return rows.map((r) => ({
    id: String(r.id),
    studentCode: String(r.student_code),
    fullName: String(r.full_name),
    className: String(r.class_name),
    createdAt: new Date(String(r.created_at)),
    lastActive: r.last_active ? new Date(String(r.last_active)) : null,
    quizzes: num(r.quizzes),
    chaptersPassed: num(r.passed),
    bestAvg: ratio(r.best_avg),
    cardsMastered: num(r.mastered),
    questions: num(r.questions),
  }));
}

export interface StudentDetail {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  visitorId: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  recentQuestions: { text: string; subject: string; createdAt: Date }[];
}

export async function getStudent(studentCode: string): Promise<StudentDetail | null> {
  const [u] = await db.execute<Record<string, unknown>>(sql`
    select id, student_code, full_name, class_name, visitor_id, created_at, last_login_at
    from users where role = 'hoc-vien' and student_code = ${studentCode}`);
  if (!u) return null;
  const questions = await db.execute<Record<string, unknown>>(sql`
    select m.content, c.subject, m.created_at from messages m join conversations c on c.id = m.conversation_id
    where c.visitor_id = ${u.visitor_id} and m.role = 'user' order by m.created_at desc limit 15`);
  return {
    id: String(u.id),
    studentCode: String(u.student_code),
    fullName: String(u.full_name),
    className: String(u.class_name),
    visitorId: String(u.visitor_id),
    createdAt: new Date(String(u.created_at)),
    lastLoginAt: u.last_login_at ? new Date(String(u.last_login_at)) : null,
    recentQuestions: questions.map((q) => ({ text: String(q.content), subject: String(q.subject), createdAt: new Date(String(q.created_at)) })),
  };
}
