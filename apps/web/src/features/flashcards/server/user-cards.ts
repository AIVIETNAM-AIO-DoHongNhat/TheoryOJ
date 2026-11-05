import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { flashcardStates, userFlashcards } from "@/lib/db/schema";

import type { Flashcard } from "../types";

// Thẻ học viên tự tạo (bôi đen trong trình đọc). Mã thẻ `u-<id>` dùng chung bảng lịch ôn flashcard_states.

export const USER_CARD_PREFIX = "u-";
export const isUserCardId = (id: string) => /^u-\d+$/.test(id);

type Row = typeof userFlashcards.$inferSelect;

const toCard = (r: Row): Flashcard => ({
  id: `${USER_CARD_PREFIX}${r.id}`,
  kind: "khai_niem",
  front: r.front,
  back: r.back,
  own: true,
  pdfPage: r.pdfPage ?? undefined,
  sourceSlug: r.sourceSlug ?? undefined,
});

export async function getUserCards(visitorId: string, subject: string, chapter: number): Promise<Flashcard[]> {
  const rows = await db
    .select()
    .from(userFlashcards)
    .where(and(eq(userFlashcards.visitorId, visitorId), eq(userFlashcards.subject, subject), eq(userFlashcards.chapter, chapter)))
    .orderBy(userFlashcards.createdAt);
  return rows.map(toCard);
}

/** Số thẻ tự tạo theo chương. */
export async function userCardCounts(visitorId: string, subject: string): Promise<Record<number, number>> {
  const rows = await db
    .select({ chapter: userFlashcards.chapter, n: count() })
    .from(userFlashcards)
    .where(and(eq(userFlashcards.visitorId, visitorId), eq(userFlashcards.subject, subject)))
    .groupBy(userFlashcards.chapter);
  return Object.fromEntries(rows.map((r) => [r.chapter, r.n]));
}

/** Mã thẻ tự tạo của một môn, để tính số thẻ đã thuộc, đến hạn cùng với thẻ trong content/. */
export async function userCardIds(visitorId: string, subject: string): Promise<{ id: string; chapter: number }[]> {
  const rows = await db
    .select({ id: userFlashcards.id, chapter: userFlashcards.chapter })
    .from(userFlashcards)
    .where(and(eq(userFlashcards.visitorId, visitorId), eq(userFlashcards.subject, subject)));
  return rows.map((r) => ({ id: `${USER_CARD_PREFIX}${r.id}`, chapter: r.chapter }));
}

export async function findUserCard(visitorId: string, cardId: string): Promise<Row | null> {
  if (!isUserCardId(cardId)) return null;
  const [row] = await db
    .select()
    .from(userFlashcards)
    .where(and(eq(userFlashcards.id, Number(cardId.slice(USER_CARD_PREFIX.length))), eq(userFlashcards.visitorId, visitorId)))
    .limit(1);
  return row ?? null;
}

export async function countUserCards(visitorId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(userFlashcards).where(eq(userFlashcards.visitorId, visitorId));
  return row?.n ?? 0;
}

export async function insertUserCard(values: typeof userFlashcards.$inferInsert): Promise<Flashcard> {
  const [row] = await db.insert(userFlashcards).values(values).returning();
  return toCard(row);
}

export async function updateUserCard(visitorId: string, id: number, front: string, back: string): Promise<Flashcard | null> {
  const [row] = await db
    .update(userFlashcards)
    .set({ front, back })
    .where(and(eq(userFlashcards.id, id), eq(userFlashcards.visitorId, visitorId)))
    .returning();
  return row ? toCard(row) : null;
}

/** Xóa thẻ cùng lịch ôn của nó. */
export async function deleteUserCard(visitorId: string, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .delete(userFlashcards)
      .where(and(eq(userFlashcards.id, id), eq(userFlashcards.visitorId, visitorId)))
      .returning({ subject: userFlashcards.subject });
    if (!row) return;
    await tx
      .delete(flashcardStates)
      .where(and(eq(flashcardStates.visitorId, visitorId), eq(flashcardStates.subject, row.subject), eq(flashcardStates.cardId, `${USER_CARD_PREFIX}${id}`)));
  });
}
