import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversations, messages, practiceAttempts } from "@/lib/db/schema";

export type AttemptKind = "quiz" | "exercise";

export async function saveAttempt(a: {
  visitorId: string;
  subject: string;
  chapter: number;
  kind: AttemptKind;
  score: number;
  total: number;
  details: unknown;
}) {
  await db.insert(practiceAttempts).values(a);
}

export interface ChapterProgress {
  chapter: number;
  quizAttempts: number;
  /** Tỷ lệ đúng cao nhất và của lượt gần nhất, 0–1. */
  quizBest: number | null;
  quizLast: number | null;
  exerciseAttempts: number;
  exerciseSolved: number;
  /** Số câu đã hỏi trợ lý có chọn chương này. */
  questions: number;
}

export interface RecentAttempt {
  kind: AttemptKind;
  chapter: number;
  score: number;
  total: number;
  createdAt: Date;
}

export interface Progress {
  chapters: ChapterProgress[];
  recent: RecentAttempt[];
}

/** Tổng hợp tiến độ của một trình duyệt trong một môn. Dữ liệu mỗi người ít nên gộp trong bộ nhớ. */
export async function getProgress(visitorId: string, subject: string, chapters: number[]): Promise<Progress> {
  const [attempts, asked] = await Promise.all([
    db
      .select({
        kind: practiceAttempts.kind,
        chapter: practiceAttempts.chapter,
        score: practiceAttempts.score,
        total: practiceAttempts.total,
        createdAt: practiceAttempts.createdAt,
      })
      .from(practiceAttempts)
      .where(and(eq(practiceAttempts.visitorId, visitorId), eq(practiceAttempts.subject, subject)))
      .orderBy(desc(practiceAttempts.createdAt)),
    db
      .select({ chapters: messages.chapters })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.visitorId, visitorId), eq(conversations.subject, subject), eq(messages.role, "assistant"))),
  ]);

  const rows = chapters.map((n): ChapterProgress => {
    const quiz = attempts.filter((a) => a.chapter === n && a.kind === "quiz");
    const exercises = attempts.filter((a) => a.chapter === n && a.kind === "exercise");
    const ratio = (a: { score: number; total: number }) => (a.total ? a.score / a.total : 0);
    return {
      chapter: n,
      quizAttempts: quiz.length,
      quizBest: quiz.length ? Math.max(...quiz.map(ratio)) : null,
      quizLast: quiz.length ? ratio(quiz[0]) : null,
      exerciseAttempts: exercises.length,
      exerciseSolved: exercises.filter((a) => a.score === a.total).length,
      questions: asked.filter((m) => m.chapters?.includes(n)).length,
    };
  });

  return { chapters: rows, recent: attempts.slice(0, 8) };
}
