import "server-only";

import { and, asc, count, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { notebookPages, notebooks } from "@/lib/db/schema";

import {
  COLOR_IDS, FONT_IDS, ICON_IDS, type Notebook, type NotebookPage, type NotebookPick, type NotebookSettings, ORDER_IDS,
  PAPER_IDS, type PageOrder, type PageSummary, plainExcerpt,
} from "../types";

// Mọi truy vấn đều lọc theo visitor_id của học viên đang đăng nhập: sổ của người khác coi như không có.

type NotebookRow = typeof notebooks.$inferSelect;
type PageRow = typeof notebookPages.$inferSelect;

/** Giá trị cũ hoặc lạ trong DB thì quay về mặc định, để giao diện không vỡ. */
const pick = <T extends string>(ids: readonly T[], v: string, fallback: T): T => (ids.includes(v as T) ? (v as T) : fallback);

function toNotebook(r: NotebookRow, pageCount: number): Notebook {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    color: pick(COLOR_IDS, r.color, "xanh-la"),
    icon: pick(ICON_IDS, r.icon, "so"),
    paper: pick(PAPER_IDS, r.paper, "ke-ngang"),
    fontSize: pick(FONT_IDS, r.fontSize, "vua"),
    pageOrder: pick(ORDER_IDS, r.pageOrder, "moi-sua"),
    subject: r.subject,
    pinned: r.pinned,
    pageCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toSummary(r: Omit<PageRow, "body" | "visitorId"> & { body?: string; excerpt?: string }): PageSummary {
  return {
    id: r.id,
    notebookId: r.notebookId,
    title: r.title,
    excerpt: r.excerpt !== undefined ? plainExcerpt(r.excerpt) : plainExcerpt(r.body ?? ""),
    subject: r.subject,
    chapter: r.chapter,
    pinned: r.pinned,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const toPage = (r: PageRow): NotebookPage => ({ ...toSummary(r), body: r.body });

const pageCountSql = sql<number>`(select count(*)::int from ${notebookPages} where ${notebookPages.notebookId} = ${notebooks.id})`;

/** Sổ của học viên: sổ ghim trước, rồi sổ mới dùng. */
export async function listNotebooks(visitorId: string): Promise<Notebook[]> {
  const rows = await db
    .select({ ...getTableColumns(notebooks), pageCount: pageCountSql })
    .from(notebooks)
    .where(eq(notebooks.visitorId, visitorId))
    .orderBy(desc(notebooks.pinned), desc(notebooks.updatedAt));
  return rows.map(({ pageCount, ...r }) => toNotebook(r, pageCount));
}

export async function getNotebook(visitorId: string, id: number): Promise<Notebook | null> {
  const [row] = await db
    .select({ ...getTableColumns(notebooks), pageCount: pageCountSql })
    .from(notebooks)
    .where(and(eq(notebooks.id, id), eq(notebooks.visitorId, visitorId)))
    .limit(1);
  return row ? toNotebook(row, row.pageCount) : null;
}

export async function countNotebooks(visitorId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(notebooks).where(eq(notebooks.visitorId, visitorId));
  return row?.n ?? 0;
}

export async function insertNotebook(visitorId: string, s: NotebookSettings): Promise<Notebook> {
  const [row] = await db.insert(notebooks).values({ visitorId, ...s }).returning();
  return toNotebook(row, 0);
}

export async function updateNotebook(visitorId: string, id: number, s: Partial<NotebookSettings> & { pinned?: boolean }): Promise<boolean> {
  const rows = await db
    .update(notebooks)
    .set({ ...s, updatedAt: sql`now()` })
    .where(and(eq(notebooks.id, id), eq(notebooks.visitorId, visitorId)))
    .returning({ id: notebooks.id });
  return rows.length > 0;
}

/** Xóa sổ cùng mọi trang trong sổ (khóa ngoại cascade). */
export async function deleteNotebook(visitorId: string, id: number): Promise<void> {
  await db.delete(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.visitorId, visitorId)));
}

/** Đánh dấu sổ vừa được dùng, để lên đầu danh sách. */
async function touchNotebook(id: number) {
  await db.update(notebooks).set({ updatedAt: sql`now()` }).where(eq(notebooks.id, id));
}

const ORDER_BY: Record<PageOrder, ReturnType<typeof desc>[]> = {
  "moi-sua": [desc(notebookPages.updatedAt)],
  "moi-tao": [desc(notebookPages.createdAt)],
  "cu-truoc": [asc(notebookPages.createdAt)],
  ten: [asc(sql`lower(${notebookPages.title})`), asc(notebookPages.createdAt)],
};

const summaryColumns = {
  id: notebookPages.id,
  notebookId: notebookPages.notebookId,
  title: notebookPages.title,
  // Chỉ lấy phần đầu nội dung để danh sách nhẹ, kể cả khi trang rất dài.
  excerpt: sql<string>`left(${notebookPages.body}, 400)`,
  subject: notebookPages.subject,
  chapter: notebookPages.chapter,
  pinned: notebookPages.pinned,
  createdAt: notebookPages.createdAt,
  updatedAt: notebookPages.updatedAt,
};

/** Trang trong sổ, trang ghim trước. `q` thì tìm trong tiêu đề và nội dung. */
export async function listPages(visitorId: string, notebookId: number, order: PageOrder, q?: string): Promise<PageSummary[]> {
  const term = q?.trim();
  const match = term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const rows = await db
    .select(summaryColumns)
    .from(notebookPages)
    .where(
      and(
        eq(notebookPages.notebookId, notebookId),
        eq(notebookPages.visitorId, visitorId),
        match ? or(ilike(notebookPages.title, match), ilike(notebookPages.body, match)) : undefined,
      ),
    )
    .orderBy(desc(notebookPages.pinned), ...ORDER_BY[order]);
  return rows.map(toSummary);
}

export async function getPage(visitorId: string, id: number): Promise<NotebookPage | null> {
  const [row] = await db
    .select()
    .from(notebookPages)
    .where(and(eq(notebookPages.id, id), eq(notebookPages.visitorId, visitorId)))
    .limit(1);
  return row ? toPage(row) : null;
}

/** Mọi trang của sổ kèm toàn văn, để tải về. */
export async function allPages(visitorId: string, notebookId: number, order: PageOrder): Promise<NotebookPage[]> {
  const rows = await db
    .select()
    .from(notebookPages)
    .where(and(eq(notebookPages.notebookId, notebookId), eq(notebookPages.visitorId, visitorId)))
    .orderBy(...ORDER_BY[order]);
  return rows.map(toPage);
}

export async function countPages(notebookId: number): Promise<number> {
  const [row] = await db.select({ n: count() }).from(notebookPages).where(eq(notebookPages.notebookId, notebookId));
  return row?.n ?? 0;
}

export async function insertPage(values: {
  visitorId: string;
  notebookId: number;
  title: string;
  body: string;
  subject: string | null;
  chapter: number | null;
}): Promise<NotebookPage> {
  const [row] = await db.insert(notebookPages).values(values).returning();
  await touchNotebook(values.notebookId);
  return toPage(row);
}

export async function updatePage(
  visitorId: string,
  id: number,
  values: Partial<{ title: string; body: string; subject: string | null; chapter: number | null; pinned: boolean; notebookId: number }>,
): Promise<NotebookPage | null> {
  const [row] = await db
    .update(notebookPages)
    .set({ ...values, updatedAt: sql`now()` })
    .where(and(eq(notebookPages.id, id), eq(notebookPages.visitorId, visitorId)))
    .returning();
  if (row) await touchNotebook(row.notebookId);
  return row ? toPage(row) : null;
}

/** Nối thêm một đoạn vào cuối trang. Nối trong SQL để hai lần chép liền nhau không đè nhau. */
export async function appendToPage(visitorId: string, notebookId: number, id: number, chunk: string, maxLength: number): Promise<NotebookPage | null> {
  const [row] = await db
    .update(notebookPages)
    .set({
      body: sql`case when ${notebookPages.body} = '' then ${chunk} else rtrim(${notebookPages.body}) || ${`\n\n${chunk}`} end`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(notebookPages.id, id),
        eq(notebookPages.notebookId, notebookId),
        eq(notebookPages.visitorId, visitorId),
        sql`length(${notebookPages.body}) + ${chunk.length + 2} <= ${maxLength}`,
      ),
    )
    .returning();
  if (row) await touchNotebook(row.notebookId);
  return row ? toPage(row) : null;
}

export async function deletePage(visitorId: string, id: number): Promise<void> {
  const [row] = await db
    .delete(notebookPages)
    .where(and(eq(notebookPages.id, id), eq(notebookPages.visitorId, visitorId)))
    .returning({ notebookId: notebookPages.notebookId });
  if (row) await touchNotebook(row.notebookId);
}

/** Sổ cùng tối đa 15 trang mới sửa của mỗi sổ, cho hộp chọn "Vào sổ". */
export async function notebookPicks(visitorId: string): Promise<NotebookPick[]> {
  const [books, pages] = await Promise.all([
    db
      .select({ id: notebooks.id, title: notebooks.title, color: notebooks.color, icon: notebooks.icon })
      .from(notebooks)
      .where(eq(notebooks.visitorId, visitorId))
      .orderBy(desc(notebooks.pinned), desc(notebooks.updatedAt)),
    db
      .select({ id: notebookPages.id, notebookId: notebookPages.notebookId, title: notebookPages.title })
      .from(notebookPages)
      .where(eq(notebookPages.visitorId, visitorId))
      .orderBy(desc(notebookPages.updatedAt))
      .limit(300),
  ]);
  return books.map((b) => ({
    id: b.id,
    title: b.title,
    color: pick(COLOR_IDS, b.color, "xanh-la"),
    icon: pick(ICON_IDS, b.icon, "so"),
    pages: pages.filter((p) => p.notebookId === b.id).slice(0, 15).map((p) => ({ id: p.id, title: p.title })),
  }));
}

/** Trang sổ gắn với một chương, mới sửa trước, kèm tên sổ. */
export async function chapterPages(visitorId: string, subject: string, chapter: number, limit = 6) {
  const rows = await db
    .select({ ...summaryColumns, notebookTitle: notebooks.title, notebookColor: notebooks.color })
    .from(notebookPages)
    .innerJoin(notebooks, eq(notebooks.id, notebookPages.notebookId))
    .where(and(eq(notebookPages.visitorId, visitorId), eq(notebookPages.subject, subject), eq(notebookPages.chapter, chapter)))
    .orderBy(desc(notebookPages.updatedAt))
    .limit(limit);
  return rows.map(({ notebookTitle, notebookColor, ...r }) => ({
    ...toSummary(r),
    notebookTitle,
    notebookColor: pick(COLOR_IDS, notebookColor, "xanh-la"),
  }));
}
