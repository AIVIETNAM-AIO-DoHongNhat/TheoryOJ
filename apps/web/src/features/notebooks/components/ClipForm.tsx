"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { NoteAnchor, NoteSource } from "@/features/notes/types";
import { cn } from "@/lib/utils";

import { clipToNotebook, myNotebookPicks } from "../actions";
import { CLIP_NOTE_MAX, type NotebookPick, UNTITLED_PAGE } from "../types";

/** Sổ và trang chép lần trước, để chép liền nhiều đoạn vào cùng một trang. */
const LAST_KEY = "so-ghi-chep:chep-gan-nhat";
const NEW = "moi";

const field =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function readLast(): { notebookId: number; pageId: number | null } | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
    return v && typeof v.notebookId === "number" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Bước "Vào sổ" của thanh công cụ bôi đen: chọn sổ, chọn trang (hoặc trang mới mang tên tài liệu), thêm lời bàn.
 * Đoạn trích được chép kèm nguồn và số trang in, bấm vào nguồn để mở lại đúng chỗ.
 */
export function ClipForm({
  anchor,
  target,
  onDone,
}: {
  anchor: NoteAnchor;
  target: { source: NoteSource; slug: string };
  onDone: (message: string) => void;
}) {
  const [books, setBooks] = useState<NotebookPick[] | null>(null);
  const [notebookId, setNotebookId] = useState<number | null>(null);
  const [pageId, setPageId] = useState<string>(NEW);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    myNotebookPicks()
      .then(({ notebooks }) => {
        if (!alive) return;
        setBooks(notebooks);
        const last = readLast();
        const nb = notebooks.find((n) => n.id === last?.notebookId) ?? notebooks[0];
        setNotebookId(nb?.id ?? null);
        setPageId(nb && last?.notebookId === nb.id && last.pageId && nb.pages.some((p) => p.id === last.pageId) ? String(last.pageId) : NEW);
      })
      .catch(() => alive && setError("Chưa tải được danh sách sổ."));
    return () => {
      alive = false;
    };
  }, []);

  const book = books?.find((b) => b.id === notebookId);

  const submit = async (form: FormData) => {
    setPending(true);
    setError(null);
    try {
      const r = await clipToNotebook({
        ...target,
        quote: anchor.quote,
        pdfPage: anchor.pdfPage,
        chapter: anchor.chapter,
        note: String(form.get("note") ?? ""),
        notebookId,
        pageId: pageId === NEW ? null : Number(pageId),
      });
      try {
        localStorage.setItem(LAST_KEY, JSON.stringify({ notebookId: r.notebookId, pageId: r.pageId }));
      } catch {}
      onDone(`Đã chép vào “${r.pageTitle || UNTITLED_PAGE}”, sổ ${r.notebookTitle}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa chép được vào sổ.");
    } finally {
      setPending(false);
    }
  };

  if (!books && !error) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-2">
      <blockquote className="line-clamp-3 border-l-2 border-primary pl-2 text-xs text-muted-foreground">{anchor.quote}</blockquote>
      {books && books.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            Sổ
            <select
              className={field}
              value={notebookId ?? ""}
              onChange={(e) => {
                setNotebookId(Number(e.target.value));
                setPageId(NEW);
              }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            Trang
            <select className={field} value={pageId} onChange={(e) => setPageId(e.target.value)}>
              <option value={NEW}>+ Trang mới</option>
              {book?.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || UNTITLED_PAGE}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        books && <p className="text-xs text-muted-foreground">Chưa có sổ nào. Đoạn trích sẽ vào một sổ mới tạo cho môn này; đổi tên, màu bìa sau ở trang Sổ ghi chép.</p>
      )}
      <Textarea name="note" maxLength={CLIP_NOTE_MAX} placeholder="Ý của đồng chí về đoạn này (có thể để trống)" className="max-h-40 min-h-16" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending || !books} className={cn(pending && "cursor-wait")}>
        {pending ? "Đang chép…" : pageId === NEW ? "Chép vào trang mới" : "Chép tiếp vào trang"}
      </Button>
    </form>
  );
}
