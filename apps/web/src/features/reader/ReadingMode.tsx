"use client";

import { BookOpenText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { NotesPanel } from "@/features/notes/components/NotesPanel";
import { SelectionMenu } from "@/features/notes/components/SelectionMenu";
import { anchorFromRange, clearNotePaint, paintNotes, revealNote } from "@/features/notes/dom";
import type { NoteSource, ReaderNote } from "@/features/notes/types";
import { useDocNotes } from "@/features/notes/useDocNotes";
import { cn } from "@/lib/utils";

import { ReaderSettingsMenu } from "./ReaderSettingsMenu";
import { readerStyle, useReaderSettings } from "./settings";

/**
 * Bọc nội dung văn bản dài (bài viết, văn kiện). Bình thường hiện như cũ kèm nút "Chế độ đọc";
 * bật lên thì nội dung phủ toàn màn hình, không đầu trang, chân trang, nút nổi; có thanh tiến độ,
 * chọn nền, cỡ chữ, kiểu chữ, độ rộng dòng. Nội dung là phần đã dựng sẵn ở máy chủ, bật tắt chỉ đổi khung bao quanh.
 * Có `notes` thì bôi đen để ghi chú, hỏi trợ lý, tạo thẻ; đoạn đã ghi chú được tô lại khi mở.
 */
export function ReadingMode({
  title,
  meta,
  notes,
  children,
  className,
}: {
  title: string;
  /** Dòng phụ dưới tiêu đề khi đọc toàn màn hình (tác giả, ngày, loại tài liệu). */
  meta?: ReactNode;
  /** Nơi lưu ghi chú; chương dùng cho thẻ ghi nhớ và câu hỏi gửi trợ lý. */
  notes?: { source: NoteSource; slug: string; subject: string; chapter: number | null };
  children: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settings] = useReaderSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const docNotes = useDocNotes(notes?.source ?? null, notes?.slug ?? "");

  // Nội dung được dựng lại khi bật tắt chế độ đọc, nên tô lại cả khi `active` đổi.
  useEffect(() => {
    if (contentRef.current) paintNotes([{ root: contentRef.current, notes: docNotes.notes }]);
  }, [docNotes.notes, active]);
  useEffect(() => clearNotePaint, []);

  const chapter = notes?.chapter ?? null;
  const resolveSelection = useCallback(
    (range: Range) => {
      const ctx = contentRef.current && anchorFromRange(contentRef.current, range);
      return ctx ? { ...ctx, pdfPage: null, chapter } : null;
    },
    [chapter],
  );
  const openNote = (n: ReaderNote) => {
    if (contentRef.current) revealNote(contentRef.current, n);
  };

  const notesPanel = notes && (
    <NotesPanel notes={docNotes.notes} signedIn={docNotes.signedIn} onOpen={openNote} onUpdate={docNotes.update} onRemove={docNotes.remove} />
  );
  const content = (
    <div ref={contentRef} className="contents">
      {children}
    </div>
  );

  const exit = useCallback(() => setActive(false), []);

  // Khi đang đọc: khoá cuộn trang phía sau, Esc để thoát, đưa tiêu điểm vào khung để phím mũi tên, Space cuộn được.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-open][role=dialog], [data-popup-open]")) exit();
    };
    window.addEventListener("keydown", onKey);
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, exit]);

  const onScroll = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 1);
  }, []);

  const open = () => {
    setProgress(0);
    setActive(true);
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role={active ? "dialog" : undefined}
      aria-modal={active || undefined}
      aria-label={active ? `Đọc: ${title}` : undefined}
      onScroll={active ? onScroll : undefined}
      data-reader-theme={active ? settings.theme : undefined}
      style={active ? readerStyle(settings) : undefined}
      className={cn(
        "outline-none",
        active ? "reader-active fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background text-foreground" : className,
      )}
    >
      {active ? (
        <>
          <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-4">
              <Button variant="ghost" size="sm" onClick={exit} aria-label="Thoát chế độ đọc (Esc)">
                <X data-icon="inline-start" />
                Thoát
              </Button>
              <p className="min-w-0 flex-1 truncate text-center text-sm text-muted-foreground">{title}</p>
              {notesPanel}
              <ReaderSettingsMenu />
            </div>
            <div className="h-0.5 w-full bg-muted" role="progressbar" aria-label="Tiến độ đọc" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          <div className="mx-auto flex flex-col gap-8 px-5 pt-10 pb-24 sm:pt-16" style={{ maxWidth: "min(100%, var(--reader-width))" }}>
            <header className="flex flex-col gap-3 border-b pb-8">
              <h1 className="font-heading text-3xl leading-tight font-bold sm:text-4xl">{title}</h1>
              {meta && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">{meta}</div>}
            </header>
            {content}
            <div className="flex flex-col items-center gap-3 border-t pt-8 text-sm text-muted-foreground">
              <p>Hết bài.</p>
              <Button variant="outline" size="sm" onClick={exit}>
                Thoát chế độ đọc
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-card" onClick={open}>
              <BookOpenText data-icon="inline-start" />
              Chế độ đọc
            </Button>
            {notesPanel}
          </div>
          {content}
        </>
      )}
      {notes && (
        <SelectionMenu
          rootRef={contentRef}
          resolve={resolveSelection}
          target={{ source: notes.source, slug: notes.slug }}
          subject={notes.subject}
          signedIn={docNotes.signedIn}
          onSaved={docNotes.add}
        />
      )}
    </div>
  );
}
