import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { flashcardStates } from "@/lib/db/schema";

import type { CardState } from "../schedule";
import type { CardStateDTO } from "../types";

/** Lịch ôn của một mã khách trong một môn, theo mã thẻ. */
export async function getStates(visitorId: string, subject: string): Promise<Map<string, CardState & { chapter: number }>> {
  const rows = await db
    .select()
    .from(flashcardStates)
    .where(and(eq(flashcardStates.visitorId, visitorId), eq(flashcardStates.subject, subject)));
  return new Map(
    rows.map((r) => [
      r.cardId,
      {
        chapter: r.chapter,
        ease: r.ease,
        intervalDays: r.intervalDays,
        reps: r.reps,
        lapses: r.lapses,
        reviews: r.reviews,
        dueAt: r.dueAt,
      },
    ]),
  );
}

export async function saveState(key: { visitorId: string; subject: string; chapter: number; cardId: string }, s: CardState) {
  const values = {
    ease: s.ease,
    intervalDays: s.intervalDays,
    reps: s.reps,
    lapses: s.lapses,
    reviews: s.reviews,
    dueAt: s.dueAt,
    lastReviewedAt: sql`now()`,
  };
  await db
    .insert(flashcardStates)
    .values({ ...key, ...values })
    .onConflictDoUpdate({ target: [flashcardStates.visitorId, flashcardStates.subject, flashcardStates.cardId], set: values });
}

export const toDTO = (s: CardState): CardStateDTO => ({ ...s, dueAt: s.dueAt.toISOString() });
export const fromDTO = (s: CardStateDTO): CardState => ({ ...s, dueAt: new Date(s.dueAt) });
