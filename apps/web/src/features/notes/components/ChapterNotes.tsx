import { BookMarked, GalleryVerticalEnd, NotebookPen } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { getPost } from "@/features/blog/server/posts";
import { userCardCounts } from "@/features/flashcards/server/user-cards";
import { getDoc } from "@/features/library/server/catalog";
import { printedPage } from "@/features/library/types";
import { chapterPages } from "@/features/notebooks/server/notebooks";
import { NOTEBOOK_COLORS, notebookHref, UNTITLED_PAGE } from "@/features/notebooks/types";
import { reviewHref } from "@/features/review/paths";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

import { listChapterNotes } from "../server/notes";
import { noteHref, type ReaderNote } from "../types";

function where(n: ReaderNote): string {
  if (n.source === "bai-viet") return getPost(n.slug)?.title ?? "Bài viết";
  const doc = getDoc(n.slug);
  if (!doc) return "Tài liệu";
  return n.pdfPage ? `${doc.title}, tr. ${printedPage(doc, n.pdfPage)}` : doc.title;
}

/** Ghi chú và thẻ tự tạo của học viên trong một chương, đặt trong bước "Ghi chép" của trang chương. Khách và học viên chưa ghi gì không thấy gì. */
export async function ChapterNotes({ subject, chapter, hasDeck }: { subject: string; chapter: number; hasDeck: boolean }) {
  await connection();
  const user = await getCurrentUser();
  if (!isStudent(user)) return null;
  const [notes, cards, pages] = await Promise.all([
    listChapterNotes(user.visitorId, subject, chapter, 6),
    userCardCounts(user.visitorId, subject),
    chapterPages(user.visitorId, subject, chapter, 4),
  ]);
  const ownCards = cards[chapter] ?? 0;
  if (!notes.length && !ownCards && !pages.length) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-[15px] font-semibold">Ghi chú của tôi trong chương</h3>
        {ownCards > 0 && (
          <Link href={reviewHref(subject, chapter, "the-ghi-nho")} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <GalleryVerticalEnd className="size-4" />
            {ownCards} thẻ tự tạo{hasDeck ? "" : ", ôn ngay"} →
          </Link>
        )}
      </div>
      {pages.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {pages.map((p) => (
            <li key={p.id}>
              <Link
                href={notebookHref(p.notebookId, p.id)}
                className="group flex h-full flex-col gap-1.5 rounded-xl border border-l-4 bg-card p-4 transition-colors hover:bg-primary-soft"
                style={{ borderLeftColor: NOTEBOOK_COLORS[p.notebookColor].cover }}
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookMarked className="size-3.5" />
                  Sổ {p.notebookTitle}
                </span>
                <span className="font-medium leading-snug group-hover:text-primary">{p.title || UNTITLED_PAGE}</span>
                {p.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {notes.map((n) => (
            <li key={n.id}>
              <Link href={noteHref(n)} className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <NotebookPen className="size-3.5" />
                  {where(n)}
                </span>
                <blockquote className="line-clamp-3 border-l-2 border-primary pl-2 text-sm text-muted-foreground">{n.quote}</blockquote>
                {n.note && <p className="line-clamp-3 text-sm group-hover:text-primary">{n.note}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
