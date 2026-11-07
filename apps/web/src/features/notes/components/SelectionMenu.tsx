"use client";

import { BookMarked, Layers, MessageCircleQuestion, NotebookPen, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCard } from "@/features/flashcards/actions";
import { CARD_BACK_MAX, CARD_FRONT_MAX } from "@/features/flashcards/types";
import { ClipForm } from "@/features/notebooks/components/ClipForm";
import { errorMessage, unwrap } from "@/lib/action-result";

import { saveNote } from "../actions";
import { askAboutHref, NOTE_MAX, type NoteAnchor, type NoteSource, type ReaderNote } from "../types";

type Step = "menu" | "note" | "card" | "clip";

interface Shown {
  anchor: NoteAnchor;
  rect: { left: number; top: number; bottom: number; width: number };
  step: Step;
}

const MENU_W = 396;
const TITLES: Record<Exclude<Step, "menu">, string> = { note: "Ghi chú", card: "Tạo thẻ ghi nhớ", clip: "Chép vào sổ ghi chép" };
const FORM_W = 340;

/**
 * Thanh công cụ nổi khi bôi đen chữ trong `rootRef`: ghi chú, chép vào sổ ghi chép, hỏi trợ lý, tạo thẻ ghi nhớ.
 * `resolve` đổi vùng chọn thành vị trí ghi chú (trang PDF, chương, đoạn trích kèm ngữ cảnh); null thì không hiện.
 * Popover gắn `data-popup-open` để Esc và phím tắt của trình đọc bỏ qua khi đang mở.
 */
export function SelectionMenu({
  rootRef,
  resolve,
  target,
  subject,
  signedIn,
  onSaved,
  onCardCreated,
}: {
  rootRef: RefObject<HTMLElement | null>;
  resolve: (range: Range) => NoteAnchor | null;
  target: { source: NoteSource; slug: string };
  subject: string;
  /** Học viên đã đăng nhập; người khác chỉ hỏi được trợ lý. */
  signedIn: boolean;
  onSaved: (note: ReaderNote) => void;
  onCardCreated?: () => void;
}) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pointerDown = useRef(false);
  const resolveRef = useRef(resolve);
  useLayoutEffect(() => {
    resolveRef.current = resolve;
  }, [resolve]);

  const close = useCallback(() => {
    setShown(null);
    setError(null);
  }, []);

  // Hiện thanh công cụ khi vùng chọn dừng lại trong vùng đọc. Chờ thả chuột (máy tính) hoặc ngừng kéo tay cầm (điện thoại).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const sel = window.getSelection();
      const root = rootRef.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !root) {
        setShown((s) => (s?.step === "menu" ? null : s));
        return;
      }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      const anchor = resolveRef.current(range);
      if (!anchor) return;
      const r = range.getBoundingClientRect();
      setError(null);
      setShown((s) => (s && s.step !== "menu" ? s : { anchor, rect: { left: r.left, top: r.top, bottom: r.bottom, width: r.width }, step: "menu" }));
    };
    const onChange = () => {
      clearTimeout(timer);
      if (!pointerDown.current) timer = setTimeout(check, 250);
    };
    const onDown = (e: PointerEvent) => {
      pointerDown.current = true;
      if (!boxRef.current?.contains(e.target as Node)) setShown((s) => (s?.step === "menu" ? null : s));
    };
    const onUp = () => {
      pointerDown.current = false;
      onChange();
    };
    document.addEventListener("selectionchange", onChange);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
    };
  }, [rootRef]);

  // Cuộn thì thanh công cụ lệch chỗ: đóng. Biểu mẫu thì giữ nguyên để không mất chữ đang gõ.
  useEffect(() => {
    if (shown?.step !== "menu") return;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [shown?.step, close]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [shown, close]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  const done = (message: string) => {
    window.getSelection()?.removeAllRanges();
    close();
    setFlash(message);
  };

  const submitNote = async (form: FormData) => {
    if (!shown) return;
    setPending(true);
    setError(null);
    try {
      const note = unwrap(await saveNote({ ...target, ...shown.anchor, note: String(form.get("note") ?? "") }));
      onSaved(note);
      done("Đã lưu ghi chú.");
    } catch (e) {
      setError(errorMessage(e, "Không lưu được ghi chú."));
    } finally {
      setPending(false);
    }
  };

  const submitCard = async (form: FormData) => {
    if (!shown?.anchor.chapter) return;
    setPending(true);
    setError(null);
    try {
      unwrap(await createCard({
        subject,
        chapter: shown.anchor.chapter,
        front: String(form.get("front") ?? ""),
        back: String(form.get("back") ?? ""),
        sourceSlug: target.source === "thu-vien" ? target.slug : null,
        pdfPage: shown.anchor.pdfPage,
      }));
      onCardCreated?.();
      done(`Đã thêm vào thẻ ghi nhớ chương ${shown.anchor.chapter}.`);
    } catch (e) {
      setError(errorMessage(e, "Không tạo được thẻ."));
    } finally {
      setPending(false);
    }
  };

  // Chỉ có gì để vẽ sau khi người dùng bôi đen, nên lần dựng đầu (máy chủ và hydrate) luôn rỗng.
  if (!shown && !flash) return null;

  const loginHref = `/dang-nhap?tiep=${encodeURIComponent(`/${target.source}/${target.slug}`)}`;

  let box = null;
  if (shown) {
    const { rect, step, anchor } = shown;
    const w = Math.min(step === "menu" ? MENU_W : FORM_W, window.innerWidth - 16);
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.left + rect.width / 2 - w / 2));
    const top =
      step === "menu"
        ? rect.top > 64 ? rect.top - 48 : rect.bottom + 8
        : Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 340));

    box = (
      <div
        ref={boxRef}
        data-popup-open=""
        role={step === "menu" ? "toolbar" : "dialog"}
        aria-label={step === "menu" ? "Thao tác với đoạn đã chọn" : TITLES[step]}
        className="fixed z-70 rounded-xl border bg-popover text-popover-foreground shadow-float"
        style={{ left, top, width: w }}
        onPointerDown={step === "menu" ? (e) => e.preventDefault() : undefined}
      >
        {step === "menu" ? (
          <div className="flex items-center gap-0.5 p-1">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShown({ ...shown, step: "note" })}>
              <NotebookPen data-icon="inline-start" />
              Ghi chú
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShown({ ...shown, step: "clip" })} title="Chép đoạn này vào sổ ghi chép, kèm số trang">
              <BookMarked data-icon="inline-start" />
              Vào sổ
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" render={<Link href={askAboutHref(subject, anchor.chapter, anchor.quote)} />} nativeButton={false}>
              <MessageCircleQuestion data-icon="inline-start" />
              Hỏi trợ lý
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              disabled={!anchor.chapter}
              title={anchor.chapter ? undefined : "Chỉ tạo thẻ được ở phần thuộc một chương"}
              onClick={() => setShown({ ...shown, step: "card" })}
            >
              <Layers data-icon="inline-start" />
              Tạo thẻ
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-medium">{step === "card" ? `Thẻ ghi nhớ chương ${anchor.chapter}` : TITLES[step]}</p>
              <Button variant="ghost" size="icon-xs" onClick={close} aria-label="Đóng">
                <X />
              </Button>
            </div>
            {!signedIn ? (
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>Đăng nhập để lưu ghi chú và thẻ ghi nhớ trên mọi thiết bị.</p>
                <Button size="sm" render={<Link href={loginHref} />} nativeButton={false}>
                  Đăng nhập
                </Button>
              </div>
            ) : step === "clip" ? (
              <ClipForm anchor={anchor} target={target} onDone={done} />
            ) : step === "note" ? (
              <form action={submitNote} className="flex flex-col gap-2">
                <blockquote className="line-clamp-3 border-l-2 border-primary pl-2 text-xs text-muted-foreground">{anchor.quote}</blockquote>
                <Textarea name="note" autoFocus maxLength={NOTE_MAX} placeholder="Ý của đồng chí về đoạn này (có thể để trống)" className="max-h-48" />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Đang lưu…" : "Lưu ghi chú"}
                </Button>
              </form>
            ) : (
              <form action={submitCard} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Mặt trước (khái niệm, câu hỏi)
                  <Input name="front" autoFocus required maxLength={CARD_FRONT_MAX} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Mặt sau
                  <Textarea name="back" required maxLength={CARD_BACK_MAX} defaultValue={anchor.quote} className="max-h-40" />
                </label>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Đang tạo…" : "Tạo thẻ"}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  return createPortal(
    <>
      {box}
      {flash && (
        <div role="status" className="fixed bottom-6 left-1/2 z-70 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-float">
          {flash}
        </div>
      )}
    </>,
    document.body,
  );
}
