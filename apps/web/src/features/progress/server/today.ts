import "server-only";

import { sql } from "drizzle-orm";
import { cache } from "react";

import { ACTIVE_SUBJECTS, type Subject } from "@/config/subjects";
import { listConversations, type ConversationSummary } from "@/features/chat/server/persist";
import { cardStatus } from "@/features/flashcards/schedule";
import { getDeck } from "@/features/flashcards/server/deck";
import { getStates } from "@/features/flashcards/server/states";
import { getLastReading } from "@/features/library/server/reading";
import { quizCounts } from "@/features/quiz/server/bank";
import { PASS_RATIO } from "@/features/quiz/types";
import { db } from "@/lib/db";

import { longestStreak, nextMilestone, pickNextChapter, recentDays, type StreakDay, studyStreak, vnDay } from "../today";
import { getProgress } from "./progress";

/**
 * Ngày (giờ Việt Nam) có làm bài, ôn thẻ hoặc hỏi trợ lý trong một năm gần nhất (đủ cho kỷ lục chuỗi).
 * Đầu trang và trang Hôm nay cùng cần trong một yêu cầu nên bọc `cache` để chỉ đọc DB một lần.
 */
export const activityDays = cache(async (visitorId: string): Promise<string[]> => {
  const rows = await db.execute<{ day: string }>(sql`
    select distinct to_char(t at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as day from (
      select created_at as t from practice_attempts where visitor_id = ${visitorId}
      union all select last_reviewed_at from flashcard_states where visitor_id = ${visitorId}
      union all select m.created_at from messages m join conversations c on c.id = m.conversation_id
        where c.visitor_id = ${visitorId} and m.role = 'user'
    ) a where t > now() - interval '366 days'`);
  return rows.map((r) => r.day);
});

export interface Streak {
  streak: number;
  studiedToday: boolean;
  best: number;
  /** Mốc kế tiếp để hướng tới (3, 7, 14, 30... ngày). */
  goal: number;
  week: StreakDay[];
}

/** Chuỗi ngày học cho nút ngọn lửa ở đầu trang. Gọi sau `connection()` vì phụ thuộc thời điểm mở trang. */
export async function getStreak(visitorId: string): Promise<Streak> {
  const days = await activityDays(visitorId);
  const today = vnDay(new Date());
  const streak = studyStreak(days, today);
  return { streak, studiedToday: days.includes(today), best: longestStreak(days), goal: nextMilestone(streak), week: recentDays(days, today) };
}

export interface SubjectToday {
  subject: Subject;
  /** Thẻ đến hạn theo chương, chỉ chương có thẻ đến hạn, nhiều nhất trước. */
  due: { chapter: number; title: string; count: number }[];
  /** Chương còn thẻ chưa học lần nào. */
  newCards: { chapter: number; title: string; count: number } | null;
  nextQuiz: { chapter: number; title: string; attempted: boolean } | null;
  passed: number;
  quizChapters: number;
  mastered: number;
  cardTotal: number;
}

export interface Today {
  streak: number;
  studiedToday: boolean;
  subjects: SubjectToday[];
  conversations: ConversationSummary[];
  reading: Awaited<ReturnType<typeof getLastReading>>;
}

async function subjectToday(visitorId: string, subject: Subject, now: Date): Promise<SubjectToday> {
  const numbers = subject.chapters.map((c) => c.number);
  const [progress, states] = await Promise.all([getProgress(visitorId, subject.id, numbers), getStates(visitorId, subject.id)]);
  const counts = quizCounts(subject.id, numbers);

  const due: SubjectToday["due"] = [];
  let newCards: SubjectToday["newCards"] = null;
  let mastered = 0;
  let cardTotal = 0;
  for (const c of subject.chapters) {
    const ids = getDeck(subject.id, c.number)?.cards.map((x) => x.id) ?? [];
    const status = ids.map((id) => cardStatus(states.get(id), now));
    const dueCount = status.filter((s) => s === "den-han").length;
    const fresh = status.filter((s) => s === "moi").length;
    if (dueCount) due.push({ chapter: c.number, title: c.title, count: dueCount });
    if (fresh && !newCards) newCards = { chapter: c.number, title: c.title, count: fresh };
    mastered += status.filter((s) => s === "da-thuoc").length;
    cardTotal += ids.length;
  }
  due.sort((a, b) => b.count - a.count);

  const rows = progress.chapters;
  const next = pickNextChapter(subject.chapters, rows, counts);
  return {
    subject,
    due,
    newCards,
    nextQuiz: next ? { chapter: next.number, title: next.title, attempted: !!rows.find((r) => r.chapter === next.number)?.quizAttempts } : null,
    passed: rows.filter((r) => counts[r.chapter] && (r.quizBest ?? 0) >= PASS_RATIO).length,
    quizChapters: Object.keys(counts).length,
    mastered,
    cardTotal,
  };
}

/** Mọi thứ trang Hôm nay cần cho một học viên. Gọi sau `connection()` vì phụ thuộc thời điểm mở trang. */
export async function getToday(visitorId: string): Promise<Today> {
  const now = new Date();
  const [days, subjects, conversations, reading] = await Promise.all([
    activityDays(visitorId),
    Promise.all(ACTIVE_SUBJECTS.map((s) => subjectToday(visitorId, s, now))),
    listConversations(visitorId, 3),
    getLastReading(visitorId),
  ]);
  const today = vnDay(now);
  return { streak: studyStreak(days, today), studiedToday: days.includes(today), subjects, conversations, reading };
}
