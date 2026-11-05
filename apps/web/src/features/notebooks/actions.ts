"use server";

import { z } from "zod";

import { getPost } from "@/features/blog/server/posts";
import { getDoc } from "@/features/library/server/catalog";
import { printedPage, readerHref } from "@/features/library/types";
import { getSubject } from "@/config/subjects";
import { getCurrentUser, isStudent, requireStudent } from "@/lib/auth/session";

import {
  allPages, appendToPage, countNotebooks, countPages, deleteNotebook, deletePage, getNotebook, getPage, insertNotebook,
  insertPage, listPages, notebookPicks, updateNotebook, updatePage,
} from "./server/notebooks";
import {
  CLIP_NOTE_MAX, COLOR_IDS, DEFAULT_SETTINGS, FONT_IDS, ICON_IDS, type Notebook, NOTEBOOK_DESC_MAX, NOTEBOOK_TITLE_MAX,
  type NotebookPage, type NotebookPick, NOTEBOOKS_MAX, notebookToMarkdown, ORDER_IDS, PAGE_BODY_MAX, PAGE_TITLE_MAX,
  PAGES_PER_NOTEBOOK, PAPER_IDS, type PageSummary,
} from "./types";

// Sổ ghi chép chỉ dành cho học viên đã đăng nhập, như ghi chú và thẻ tự tạo.

const Id = z.number().int().positive();
const SubjectId = z
  .string()
  .max(32)
  .nullable()
  .transform((s) => (s && getSubject(s)?.active ? s : null));

const Settings = z.object({
  title: z.string().trim().min(1, "Cần tên sổ.").max(NOTEBOOK_TITLE_MAX),
  description: z.string().trim().max(NOTEBOOK_DESC_MAX).default(""),
  color: z.enum(COLOR_IDS).default(DEFAULT_SETTINGS.color),
  icon: z.enum(ICON_IDS).default(DEFAULT_SETTINGS.icon),
  paper: z.enum(PAPER_IDS).default(DEFAULT_SETTINGS.paper),
  fontSize: z.enum(FONT_IDS).default(DEFAULT_SETTINGS.fontSize),
  pageOrder: z.enum(ORDER_IDS).default(DEFAULT_SETTINGS.pageOrder),
  subject: SubjectId.default(null),
});

/** Chương hợp lệ của môn, hoặc null. */
function validChapter(subject: string | null, chapter: number | null | undefined): number | null {
  if (!subject || !chapter) return null;
  return getSubject(subject)?.chapters.some((c) => c.number === chapter) ? chapter : null;
}

async function ownNotebook(visitorId: string, id: number): Promise<Notebook> {
  const nb = await getNotebook(visitorId, id);
  if (!nb) throw new Error("Không có sổ này.");
  return nb;
}

async function ensureRoom(notebookId: number) {
  if ((await countPages(notebookId)) >= PAGES_PER_NOTEBOOK) throw new Error(`Mỗi sổ có tối đa ${PAGES_PER_NOTEBOOK} trang. Hãy tạo sổ mới.`);
}

export async function createNotebook(input: z.input<typeof Settings>): Promise<Notebook> {
  const { visitorId } = await requireStudent();
  const data = Settings.parse(input);
  if ((await countNotebooks(visitorId)) >= NOTEBOOKS_MAX) throw new Error(`Mỗi tài khoản có tối đa ${NOTEBOOKS_MAX} sổ.`);
  return insertNotebook(visitorId, data);
}

const UpdateInput = Settings.extend({ id: Id });

export async function saveNotebookSettings(input: z.input<typeof UpdateInput>): Promise<void> {
  const { visitorId } = await requireStudent();
  const { id, ...data } = UpdateInput.parse(input);
  if (!(await updateNotebook(visitorId, id, data))) throw new Error("Không có sổ này.");
}

export async function pinNotebook(id: number, pinned: boolean): Promise<void> {
  const { visitorId } = await requireStudent();
  await updateNotebook(visitorId, Id.parse(id), { pinned: z.boolean().parse(pinned) });
}

export async function removeNotebook(id: number): Promise<void> {
  const { visitorId } = await requireStudent();
  await deleteNotebook(visitorId, Id.parse(id));
}

const NewPage = z.object({
  notebookId: Id,
  title: z.string().trim().max(PAGE_TITLE_MAX).default(""),
  chapter: z.number().int().positive().nullable().default(null),
});

export async function createPage(input: z.input<typeof NewPage>): Promise<NotebookPage> {
  const { visitorId } = await requireStudent();
  const data = NewPage.parse(input);
  const nb = await ownNotebook(visitorId, data.notebookId);
  await ensureRoom(nb.id);
  const chapter = validChapter(nb.subject, data.chapter);
  return insertPage({ visitorId, notebookId: nb.id, title: data.title, body: "", subject: nb.subject, chapter });
}

export async function loadPage(id: number): Promise<NotebookPage> {
  const { visitorId } = await requireStudent();
  const page = await getPage(visitorId, Id.parse(id));
  if (!page) throw new Error("Không có trang này.");
  return page;
}

const SavePage = z.object({
  id: Id,
  title: z.string().trim().max(PAGE_TITLE_MAX),
  body: z.string().max(PAGE_BODY_MAX, `Một trang dài tối đa ${PAGE_BODY_MAX.toLocaleString("vi-VN")} ký tự. Hãy tách sang trang mới.`),
  subject: SubjectId,
  chapter: z.number().int().positive().nullable(),
});

/** Tự lưu từ trình soạn. Trả thời điểm lưu để hiện "Đã lưu lúc …". */
export async function savePage(input: z.input<typeof SavePage>): Promise<{ updatedAt: string }> {
  const { visitorId } = await requireStudent();
  const { id, title, body, subject, chapter } = SavePage.parse(input);
  const ch = validChapter(subject, chapter);
  const page = await updatePage(visitorId, id, { title, body, subject, chapter: ch });
  if (!page) throw new Error("Không có trang này.");
  return { updatedAt: page.updatedAt };
}

export async function pinPage(id: number, pinned: boolean): Promise<void> {
  const { visitorId } = await requireStudent();
  await updatePage(visitorId, Id.parse(id), { pinned: z.boolean().parse(pinned) });
}

export async function movePage(id: number, notebookId: number): Promise<void> {
  const { visitorId } = await requireStudent();
  const target = await ownNotebook(visitorId, Id.parse(notebookId));
  await ensureRoom(target.id);
  if (!(await updatePage(visitorId, Id.parse(id), { notebookId: target.id }))) throw new Error("Không có trang này.");
}

export async function removePage(id: number): Promise<void> {
  const { visitorId } = await requireStudent();
  await deletePage(visitorId, Id.parse(id));
}

export async function searchPages(notebookId: number, q: string): Promise<PageSummary[]> {
  const { visitorId } = await requireStudent();
  const nb = await ownNotebook(visitorId, Id.parse(notebookId));
  return listPages(visitorId, nb.id, nb.pageOrder, z.string().max(100).parse(q));
}

/** Toàn bộ sổ dạng Markdown để học viên tải về máy. */
export async function exportNotebook(id: number): Promise<{ filename: string; markdown: string }> {
  const { visitorId } = await requireStudent();
  const nb = await ownNotebook(visitorId, Id.parse(id));
  const pages = await allPages(visitorId, nb.id, nb.pageOrder === "ten" ? "ten" : "cu-truoc");
  const filename = `${nb.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "so-ghi-chep"}.md`;
  return { filename, markdown: notebookToMarkdown(nb, pages) };
}

/** Sổ và trang gần nhất cho hộp "Vào sổ" ở trình đọc. Người chưa đăng nhập nhận `signedIn: false`. */
export async function myNotebookPicks(): Promise<{ signedIn: boolean; notebooks: NotebookPick[] }> {
  const user = await getCurrentUser();
  if (!isStudent(user)) return { signedIn: false, notebooks: [] };
  return { signedIn: true, notebooks: await notebookPicks(user.visitorId) };
}

const ClipInput = z.object({
  source: z.enum(["thu-vien", "bai-viet"]),
  slug: z.string().max(200),
  quote: z.string().trim().min(1).max(1000),
  pdfPage: z.number().int().min(1).max(5000).nullable().default(null),
  chapter: z.number().int().positive().nullable().default(null),
  note: z.string().trim().max(CLIP_NOTE_MAX).default(""),
  /** Null: tạo sổ "Ghi chép <môn>" (khi chưa có sổ nào). */
  notebookId: Id.nullable(),
  /** Null: tạo trang mới mang tên tài liệu. */
  pageId: Id.nullable(),
});

/** Thoát ký hiệu Markdown, kể cả `$` để đoạn trích không bị hiểu nhầm là công thức. */
const escapeMd = (s: string) => s.replace(/([\\`*_[\]#$|<>~])/g, "\\$1");

/** Nơi lấy đoạn trích: tên, đường dẫn mở lại đúng trang, môn. */
function describeSource(source: "thu-vien" | "bai-viet", slug: string, pdfPage: number | null) {
  if (source === "bai-viet") {
    const post = getPost(slug);
    return post ? { title: post.title, label: post.title, href: `/bai-viet/${slug}`, subject: post.subject } : null;
  }
  const doc = getDoc(slug);
  if (!doc) return null;
  const page = doc.format === "pdf" && pdfPage && (!doc.pages || pdfPage <= doc.pages) ? pdfPage : null;
  return {
    title: doc.title,
    label: page ? `${doc.title}, tr. ${printedPage(doc, page)}` : doc.title,
    href: readerHref(doc.file, page),
    subject: doc.subject,
  };
}

/**
 * Chép đoạn bôi đen trong trình đọc vào sổ: trích dẫn kèm nguồn (bấm để mở lại đúng trang), rồi lời bàn của học viên.
 * Nối vào trang có sẵn, hoặc tạo trang mới mang tên tài liệu.
 */
export async function clipToNotebook(input: z.input<typeof ClipInput>): Promise<{ notebookId: number; pageId: number; notebookTitle: string; pageTitle: string }> {
  const { visitorId } = await requireStudent();
  const data = ClipInput.parse(input);
  const src = describeSource(data.source, data.slug, data.pdfPage);
  if (!src) throw new Error("Không có tài liệu này.");

  const chunk = [
    data.quote.split(/\n+/).map((l) => `> ${escapeMd(l)}`).join("\n"),
    ">",
    `> — [${escapeMd(src.label)}](${src.href})`,
    data.note && `\n${data.note}`,
  ]
    .filter(Boolean)
    .join("\n");

  let nb: Notebook;
  if (data.notebookId) {
    nb = await ownNotebook(visitorId, data.notebookId);
  } else {
    if ((await countNotebooks(visitorId)) >= NOTEBOOKS_MAX) throw new Error(`Mỗi tài khoản có tối đa ${NOTEBOOKS_MAX} sổ.`);
    const subject = getSubject(src.subject);
    nb = await insertNotebook(visitorId, { ...DEFAULT_SETTINGS, title: `Ghi chép ${subject?.shortName ?? "chung"}`, subject: subject?.active ? subject.id : null });
  }

  const chapter = validChapter(src.subject, data.chapter);
  if (data.pageId) {
    const page = await appendToPage(visitorId, nb.id, data.pageId, chunk, PAGE_BODY_MAX);
    if (!page) throw new Error("Không chép được: trang không còn, hoặc đã quá dài. Chọn “Trang mới”.");
    return { notebookId: nb.id, pageId: page.id, notebookTitle: nb.title, pageTitle: page.title };
  }
  await ensureRoom(nb.id);
  const title = (chapter ? `${src.title} · Chương ${chapter}` : src.title).slice(0, PAGE_TITLE_MAX);
  const page = await insertPage({ visitorId, notebookId: nb.id, title, body: chunk, subject: chapter ? src.subject : nb.subject, chapter });
  return { notebookId: nb.id, pageId: page.id, notebookTitle: nb.title, pageTitle: page.title };
}
