"use server";

import { z } from "zod";

import { getPost } from "@/features/blog/server/posts";
import { getDoc } from "@/features/library/server/catalog";
import { getSubject } from "@/config/subjects";
import { type DataResult, UserError } from "@/lib/action-result";
import { getCurrentUser, isStudent, requireStudent } from "@/lib/auth/session";
import { run } from "@/lib/run-action";

import { countDocNotes, createNote, deleteNote, listDocNotes, updateNote } from "./server/notes";
import { CONTEXT_LEN, NOTE_MAX, NOTES_PER_DOC, QUOTE_MAX, type ReaderNote } from "./types";

// Ghi chú chỉ dành cho học viên đã đăng nhập, như vị trí đọc (features/library/actions.ts).

const Source = z.enum(["thu-vien", "bai-viet"]);
const Target = z.object({ source: Source, slug: z.string().max(200) });

/** Môn, các chương hợp lệ và số trang PDF của nơi ghi chú. Null nếu không có tài liệu hay bài viết đó. */
function resolveTarget({ source, slug }: z.infer<typeof Target>) {
  if (source === "bai-viet") {
    const post = getPost(slug);
    return post ? { subject: post.subject, chapters: post.chapters, pages: null, defaultChapter: post.chapters[0] ?? null } : null;
  }
  const doc = getDoc(slug);
  if (!doc) return null;
  const chapters = getSubject(doc.subject)?.chapters.map((c) => c.number) ?? [];
  const defaultChapter = doc.chapters.length ? null : (doc.relatedChapters[0] ?? null);
  return { subject: doc.subject, chapters, pages: doc.format === "pdf" ? doc.pages : null, defaultChapter };
}

/** Ghi chú của học viên trên một tài liệu. Người chưa đăng nhập nhận `signedIn: false` để trình đọc mời đăng nhập. */
export async function myNotes(input: z.input<typeof Target>): Promise<{ signedIn: boolean; notes: ReaderNote[] }> {
  const parsed = Target.safeParse(input);
  const user = await getCurrentUser();
  if (!isStudent(user)) return { signedIn: false, notes: [] };
  if (!parsed.success || !resolveTarget(parsed.data)) return { signedIn: true, notes: [] };
  return { signedIn: true, notes: await listDocNotes(user.visitorId, parsed.data.source, parsed.data.slug) };
}

const SaveInput = Target.extend({
  quote: z.string().trim().min(1).max(QUOTE_MAX),
  prefix: z.string().max(CONTEXT_LEN * 2).default(""),
  suffix: z.string().max(CONTEXT_LEN * 2).default(""),
  note: z.string().trim().max(NOTE_MAX).default(""),
  pdfPage: z.number().int().min(1).max(5000).nullable().default(null),
  chapter: z.number().int().positive().nullable().default(null),
});

export async function saveNote(input: z.input<typeof SaveInput>): Promise<DataResult<ReaderNote>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    const data = SaveInput.parse(input);
    const target = resolveTarget(data);
    if (!target) throw new UserError("Không có tài liệu này.");
    if (data.pdfPage && (!target.pages || data.pdfPage > target.pages)) throw new UserError("Trang không hợp lệ.");
    if ((await countDocNotes(visitorId, data.source, data.slug)) >= NOTES_PER_DOC) {
      throw new UserError(`Mỗi tài liệu lưu tối đa ${NOTES_PER_DOC} ghi chú.`);
    }
    const chapter = data.chapter && target.chapters.includes(data.chapter) ? data.chapter : target.defaultChapter;
    return createNote({
      visitorId,
      subject: target.subject,
      source: data.source,
      slug: data.slug,
      chapter,
      pdfPage: target.pages ? data.pdfPage : null,
      quote: data.quote,
      prefix: data.prefix,
      suffix: data.suffix,
      note: data.note,
    });
  });
}

const EditInput = z.object({ id: z.number().int().positive(), note: z.string().trim().max(NOTE_MAX) });

export async function editNote(input: z.input<typeof EditInput>): Promise<DataResult<ReaderNote>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    const { id, note } = EditInput.parse(input);
    const updated = await updateNote(visitorId, id, note);
    if (!updated) throw new UserError("Không có ghi chú này.");
    return updated;
  });
}

export async function removeNote(id: number): Promise<DataResult<void>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    await deleteNote(visitorId, z.number().int().positive().parse(id));
  });
}
