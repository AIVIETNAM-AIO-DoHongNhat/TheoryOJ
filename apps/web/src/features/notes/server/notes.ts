import "server-only";

import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { readerNotes } from "@/lib/db/schema";

import type { NoteSource, ReaderNote } from "../types";

type Row = typeof readerNotes.$inferSelect;

const toDTO = (r: Row): ReaderNote => ({
  id: r.id,
  source: r.source,
  slug: r.slug,
  chapter: r.chapter,
  pdfPage: r.pdfPage,
  quote: r.quote,
  prefix: r.prefix,
  suffix: r.suffix,
  note: r.note,
  createdAt: r.createdAt.toISOString(),
});

/** Ghi chú của một tài liệu, theo thứ tự trang rồi thời gian tạo. */
export async function listDocNotes(visitorId: string, source: NoteSource, slug: string): Promise<ReaderNote[]> {
  const rows = await db
    .select()
    .from(readerNotes)
    .where(and(eq(readerNotes.visitorId, visitorId), eq(readerNotes.source, source), eq(readerNotes.slug, slug)))
    .orderBy(readerNotes.pdfPage, readerNotes.createdAt);
  return rows.map(toDTO);
}

/** Ghi chú gần nhất của một chương, ở mọi tài liệu. */
export async function listChapterNotes(visitorId: string, subject: string, chapter: number, limit = 20): Promise<ReaderNote[]> {
  const rows = await db
    .select()
    .from(readerNotes)
    .where(and(eq(readerNotes.visitorId, visitorId), eq(readerNotes.subject, subject), eq(readerNotes.chapter, chapter)))
    .orderBy(desc(readerNotes.createdAt))
    .limit(limit);
  return rows.map(toDTO);
}

/** Số ghi chú theo chương của một môn. */
export async function noteCounts(visitorId: string, subject: string): Promise<Record<number, number>> {
  const rows = await db
    .select({ chapter: readerNotes.chapter, n: count() })
    .from(readerNotes)
    .where(and(eq(readerNotes.visitorId, visitorId), eq(readerNotes.subject, subject), isNotNull(readerNotes.chapter)))
    .groupBy(readerNotes.chapter);
  return Object.fromEntries(rows.map((r) => [r.chapter!, r.n]));
}

export async function countDocNotes(visitorId: string, source: NoteSource, slug: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(readerNotes)
    .where(and(eq(readerNotes.visitorId, visitorId), eq(readerNotes.source, source), eq(readerNotes.slug, slug)));
  return row?.n ?? 0;
}

export async function createNote(values: typeof readerNotes.$inferInsert): Promise<ReaderNote> {
  const [row] = await db.insert(readerNotes).values(values).returning();
  return toDTO(row);
}

export async function updateNote(visitorId: string, id: number, note: string): Promise<ReaderNote | null> {
  const [row] = await db
    .update(readerNotes)
    .set({ note, updatedAt: sql`now()` })
    .where(and(eq(readerNotes.id, id), eq(readerNotes.visitorId, visitorId)))
    .returning();
  return row ? toDTO(row) : null;
}

export async function deleteNote(visitorId: string, id: number): Promise<void> {
  await db.delete(readerNotes).where(and(eq(readerNotes.id, id), eq(readerNotes.visitorId, visitorId)));
}
