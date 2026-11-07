import "server-only";

import { and, count, eq, ne } from "drizzle-orm";
import { cache } from "react";

import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { MASTERED_DAYS } from "@/features/flashcards/schedule";
import { getDeck } from "@/features/flashcards/server/deck";
import { isUserCardId } from "@/features/flashcards/server/user-cards";
import { activityDays } from "@/features/progress/server/today";
import { longestStreak } from "@/features/progress/today";
import { quizCounts } from "@/features/quiz/server/bank";
import { db } from "@/lib/db";
import {
  conversations, flashcardStates, messages, notebookPages, practiceAttempts, readerNotes, userBadges, userFlashcards,
} from "@/lib/db/schema";

import { type Badge, type BadgeStats, evaluateBadges } from "../catalog";

/** Gom số liệu học tập của một học viên để xét huy hiệu. Dữ liệu mỗi người ít nên gộp trong bộ nhớ như trang Tiến độ. */
async function badgeStats(visitorId: string): Promise<BadgeStats> {
  const [attempts, states, [own], [asked], [notes], [pages], days] = await Promise.all([
    db
      .select({ subject: practiceAttempts.subject, chapter: practiceAttempts.chapter, kind: practiceAttempts.kind, score: practiceAttempts.score, total: practiceAttempts.total })
      .from(practiceAttempts)
      .where(eq(practiceAttempts.visitorId, visitorId)),
    db
      .select({ subject: flashcardStates.subject, chapter: flashcardStates.chapter, cardId: flashcardStates.cardId, intervalDays: flashcardStates.intervalDays, reviews: flashcardStates.reviews })
      .from(flashcardStates)
      .where(eq(flashcardStates.visitorId, visitorId)),
    db.select({ n: count() }).from(userFlashcards).where(eq(userFlashcards.visitorId, visitorId)),
    db
      .select({ n: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.visitorId, visitorId), eq(messages.role, "user"))),
    db.select({ n: count() }).from(readerNotes).where(eq(readerNotes.visitorId, visitorId)),
    db.select({ n: count() }).from(notebookPages).where(and(eq(notebookPages.visitorId, visitorId), ne(notebookPages.body, ""))),
    activityDays(visitorId),
  ]);

  const quizzes = attempts.filter((a) => a.kind === "quiz");
  const solved = attempts.filter((a) => a.kind === "exercise" && a.total > 0 && a.score === a.total);
  const mastered = states.filter((s) => s.intervalDays >= MASTERED_DAYS);

  const allCounts = await Promise.all(ACTIVE_SUBJECTS.map((s) => quizCounts(s.id, s.chapters.map((c) => c.number))));
  const subjects = ACTIVE_SUBJECTS.map((subject, i) => {
    const counts = allCounts[i];
    const chapters = subject.chapters
      .filter((c) => counts[c.number])
      .map((c) => {
        const at = (x: { subject: string; chapter: number }) => x.subject === subject.id && x.chapter === c.number;
        const ratios = quizzes.filter(at).map((a) => (a.total ? a.score / a.total : 0));
        const deck = new Set(getDeck(subject.id, c.number)?.cards.map((x) => x.id) ?? []);
        return {
          number: c.number,
          title: c.title,
          quizBest: ratios.length ? Math.max(...ratios) : null,
          cardTotal: deck.size,
          // Chỉ thẻ còn trong bộ thẻ của chương; thẻ tự tạo tính ở huy hiệu thẻ ghi nhớ chung.
          cardsMastered: mastered.filter((s) => at(s) && !isUserCardId(s.cardId) && deck.has(s.cardId)).length,
          hasExercises: !!EXERCISES[subject.id]?.[c.number]?.length,
          exercisesSolved: solved.filter(at).length,
        };
      });
    return { id: subject.id, shortName: subject.shortName, chapters };
  });

  return {
    bestStreak: longestStreak(days),
    quizAttempts: quizzes.length,
    perfectQuizzes: quizzes.filter((a) => a.total > 0 && a.score === a.total).length,
    exercisesSolved: solved.length,
    cardReviews: states.reduce((n, s) => n + s.reviews, 0),
    cardsMastered: mastered.length,
    ownCards: own.n,
    questions: asked.n,
    notes: notes.n + pages.n,
    subjects,
  };
}

export interface CollectedBadge extends Badge {
  /** Ngày mở khóa, null nếu chưa đạt. */
  earnedAt: Date | null;
  /** Vừa mở khóa ở lần xét này. */
  fresh: boolean;
}

export interface BadgeCollection {
  badges: CollectedBadge[];
  earned: number;
  total: number;
  fresh: CollectedBadge[];
}

/**
 * Xét lại mọi huy hiệu và lưu huy hiệu mới đạt. Huy hiệu đã lưu thì giữ luôn, kể cả khi chỉ số nguồn giảm
 * (chuỗi đứt, thẻ quên). Bọc `cache` để đầu trang và thân trang cùng gọi trong một yêu cầu chỉ xét một lần.
 */
export const syncBadges = cache(async (visitorId: string): Promise<BadgeCollection> => {
  const [stats, stored] = await Promise.all([
    badgeStats(visitorId),
    db.select({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt }).from(userBadges).where(eq(userBadges.visitorId, visitorId)),
  ]);
  const evaluated = evaluateBadges(stats);
  const earnedAt = new Map(stored.map((r) => [r.badgeId, r.earnedAt]));

  const unlocked = evaluated.filter((b) => b.earned && !earnedAt.has(b.id));
  // `on conflict do nothing` cùng `returning`: hai lần xét chạy song song thì chỉ một lần báo huy hiệu mới.
  const inserted = unlocked.length
    ? await db
        .insert(userBadges)
        .values(unlocked.map((b) => ({ visitorId, badgeId: b.id })))
        .onConflictDoNothing()
        .returning({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt })
    : [];
  for (const r of inserted) earnedAt.set(r.badgeId, r.earnedAt);
  const fresh = new Set(inserted.map((r) => r.badgeId));

  const badges = evaluated.map((b): CollectedBadge => {
    const at = earnedAt.get(b.id) ?? null;
    return { ...b, earned: b.earned || at !== null, earnedAt: at, fresh: fresh.has(b.id) };
  });
  return {
    badges,
    earned: badges.filter((b) => b.earned).length,
    total: badges.length,
    fresh: badges.filter((b) => b.fresh),
  };
});
