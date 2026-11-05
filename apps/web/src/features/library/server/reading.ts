import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { readingPositions } from "@/lib/db/schema";

import { getDoc } from "./catalog";

export async function saveReadingPosition(visitorId: string, slug: string, page: number) {
  await db
    .insert(readingPositions)
    .values({ visitorId, slug, page })
    .onConflictDoUpdate({ target: [readingPositions.visitorId, readingPositions.slug], set: { page, updatedAt: sql`now()` } });
}

export async function getReadingPosition(visitorId: string, slug: string): Promise<number | null> {
  const [row] = await db
    .select({ page: readingPositions.page })
    .from(readingPositions)
    .where(and(eq(readingPositions.visitorId, visitorId), eq(readingPositions.slug, slug)))
    .limit(1);
  return row?.page ?? null;
}

/** Tài liệu đọc gần nhất còn trong thư viện, cho mục "Đọc tiếp" ở trang Hôm nay. */
export async function getLastReading(visitorId: string) {
  const rows = await db
    .select({ slug: readingPositions.slug, page: readingPositions.page, updatedAt: readingPositions.updatedAt })
    .from(readingPositions)
    .where(eq(readingPositions.visitorId, visitorId))
    .orderBy(desc(readingPositions.updatedAt))
    .limit(5);
  for (const r of rows) {
    const doc = getDoc(r.slug);
    if (doc?.format === "pdf") return { doc, page: r.page, updatedAt: r.updatedAt };
  }
  return null;
}
