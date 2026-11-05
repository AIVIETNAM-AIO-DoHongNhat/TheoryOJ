"use client";

import "react-pdf/dist/Page/TextLayer.css";

import {
  ArrowLeftRight, ArrowUpDown, ChevronLeft, ChevronRight, Download, ExternalLink, GalleryVerticalEnd, ListChecks, ListTree,
  LoaderCircle, Maximize2, MessageSquareText, Minimize2, Minus, NotebookPen, Plus, ScanLine,
} from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { NotesPanel } from "@/features/notes/components/NotesPanel";
import { SelectionMenu } from "@/features/notes/components/SelectionMenu";
import { anchorFromRange, paintNotes, revealNote } from "@/features/notes/dom";
import type { NoteAnchor, ReaderNote } from "@/features/notes/types";
import { useDocNotes } from "@/features/notes/useDocNotes";
import { ReaderSettingsMenu } from "@/features/reader/ReaderSettingsMenu";
import { reviewHref } from "@/features/review/paths";
import { type ReaderTheme, useReaderSettings } from "@/features/reader/settings";

import { lastPage, rememberPage } from "../actions";
import { type DocChapter, printedPage } from "../types";

// Worker phải khai báo trong cùng module với <Document> (README của react-pdf).
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// Cách hiển thị (giống các trình xem PDF chuyên dụng):
// - Cuộn liên tục cả tài liệu. Mỗi trang có một ô đúng kích thước; chỉ các trang gần vùng nhìn mới được vẽ.
// - Phóng to thu nhỏ đổi kích thước ô và co giãn bản vẽ cũ bằng CSS ngay lập tức; dừng tay một lúc mới vẽ lại cho nét.
//   Bản vẽ cũ giữ nguyên cho tới khi bản mới vẽ xong, nên không chớp trắng.
// - Khi đổi mức phóng, giữ nguyên vị trí đang đọc (tính theo tỷ lệ trong trang).

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
/** Khoảng cách giữa hai trang và lề trên, px. */
const GAP = 16;
/** Số trang vẽ thêm phía trên, phía dưới vùng nhìn để cuộn không thấy trang trống. */
const OVERSCAN = 2;
/** Dừng phóng bao lâu thì vẽ lại cho nét, ms. */
const SETTLE_MS = 220;

export interface PdfReaderProps {
  slug: string;
  title: string;
  subject: string;
  pages: number | null;
  pageOffset: number;
  chapters: DocChapter[];
  /** Chương có trắc nghiệm, thẻ ghi nhớ: hiện lối sang ôn tập ở thanh dưới khi đang đọc chương đó. */
  practice: Record<number, { quiz: boolean; cards: boolean }>;
}

/** Nền sáng giữ nguyên; vàng giấy ấm màu; tối đảo màu trang rồi xoay sắc độ để ảnh và chữ màu không bị lệch. */
const PAGE_FILTER: Record<ReaderTheme, string | undefined> = {
  sang: undefined,
  giay: "sepia(0.38) saturate(0.9) brightness(0.98)",
  toi: "invert(0.9) hue-rotate(180deg) brightness(0.95)",
};

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));

function readPageFromUrl(max: number | null): number | null {
  const n = Number(new URLSearchParams(window.location.search).get("trang"));
  return Number.isInteger(n) && n >= 1 && (!max || n <= max) ? n : null;
}

export function PdfReader({ slug, title, subject, pages, pageOffset, chapters, practice }: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number | null>(pages);
  /** Tài liệu đã mở xong, các ô trang đã có trong khung cuộn. Trước đó đặt scrollTop không có tác dụng. */
  const [ready, setReady] = useState(false);
  /** Tỷ lệ cao/rộng của trang, đọc từ trang 1 khi mở tài liệu. Giáo trình mọi trang cùng khổ. */
  const [aspect, setAspect] = useState(1.414);
  // Trang ban đầu lấy từ ?trang=, để trích dẫn của trợ lý mở đúng chỗ. Component chỉ chạy ở client.
  const [fromUrl] = useState(() => readPageFromUrl(pages));
  const [page, setPage] = useState(fromUrl ?? 1);
  const [pageInput, setPageInput] = useState(() => String(fromUrl ?? 1));
  /** Mức phóng đang hiển thị, đổi tức thì. */
  const [zoom, setZoom] = useState(1);
  /** Mức phóng đã vẽ ra canvas, đuổi theo `zoom` sau khi dừng tay. */
  const [renderZoom, setRenderZoom] = useState(1);
  /** Mức phóng mới nhất cho trình xử lý chụm ngón (gắn một lần, không đọc được state). */
  const zoomRef = useRef(zoom);
  useLayoutEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  /** Chế độ đọc toàn màn hình: tài liệu phủ cả cửa sổ, không đầu trang và chân trang của web. */
  const [immersive, setImmersive] = useState(false);
  const [{ theme }] = useReaderSettings();
  const stageRef = useRef<HTMLDivElement>(null);
  /** Vị trí đang đọc tính bằng số trang (2,5 là giữa trang 3), để giữ chỗ khi đổi mức phóng. */
  const anchorRef = useRef((fromUrl ?? 1) - 1);
  /** Trang cần cuộn tới khi đã đủ kích thước (mở từ ?trang=, khôi phục trang đọc lần trước). */
  const [target, setTarget] = useState<number | null>(fromUrl);
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, 2));
  const fileUrl = `/api/tai-lieu/${slug}`;
  const docNotes = useDocNotes("thu-vien", slug);
  /** Ghi chú cần tô nổi sau khi cuộn tới trang của nó và lớp chữ đã dựng. */
  const revealRef = useRef<ReaderNote | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // Bỏ qua lần báo kích thước 0: khung đổi chế độ (toàn màn hình) có lúc chưa đo xong, nếu tin thì nội dung bị gỡ
    // và vị trí đang đọc bị đặt về đầu tài liệu.
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setStage({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!immersive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-popup-open]")) setImmersive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [immersive]);

  // Khổ trang "vừa chiều ngang": vừa khung, tối đa 900 px ở mức 100 %.
  const base = stage.width ? Math.min(stage.width - 2 * GAP, 900) : 0;
  const pageW = Math.round(base * zoom);
  const pageH = Math.round(pageW * aspect);
  const span = pageH + GAP;
  const renderW = Math.round(base * renderZoom);
  const total = numPages ?? 1;

  // Vẽ lại cho nét khi đã dừng phóng.
  useEffect(() => {
    if (renderZoom === zoom) return;
    const t = setTimeout(() => setRenderZoom(zoom), SETTLE_MS);
    return () => clearTimeout(t);
  }, [zoom, renderZoom]);

  // Đổi mức phóng hoặc khổ khung: cuộn lại đúng chỗ đang đọc trước khi trình duyệt vẽ, để không thấy nhảy.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || !span || !ready) return;
    el.scrollTop = anchorRef.current * span;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [span, ready]);

  // Cuộn tới trang đích khi tài liệu đã mở và đã biết kích thước trang. Nếu cuộn sớm hơn, khung chưa đủ cao nên
  // vị trí bị kẹp về 0; trên máy có thanh cuộn nổi (điện thoại, macOS) khổ trang không đổi nên không được cuộn lại.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || !span || !ready || target === null || !numPages) return;
    const n = Math.min(Math.max(1, target), numPages);
    anchorRef.current = n - 1;
    el.scrollTop = (n - 1) * span;
    setTarget(null);
  }, [target, span, numPages, ready]);

  const onScroll = useCallback(() => {
    const el = stageRef.current;
    // Chưa có nội dung cao hơn khung (đang đổi kích thước): không phải người đọc cuộn, giữ nguyên vị trí đã nhớ.
    if (!el || !span || el.scrollHeight <= el.clientHeight) return;
    anchorRef.current = el.scrollTop / span;
    setScrollTop(el.scrollTop);
    // Trang hiện tại là trang chiếm điểm cách đỉnh khung một phần ba chiều cao.
    const n = Math.min(total, Math.max(1, Math.floor((el.scrollTop + el.clientHeight / 3) / span) + 1));
    setPage(n);
    if (document.activeElement?.getAttribute("aria-label") !== "Trang PDF") setPageInput(String(n));
  }, [span, total]);

  // Ghi ?trang= lên địa chỉ để sao chép, chia sẻ đúng trang.
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("trang", String(page));
      window.history.replaceState(null, "", url);
    }, 400);
    return () => clearTimeout(t);
  }, [page]);

  // Không có ?trang= thì mở lại trang học viên đọc lần trước (máy chủ trả null với khách).
  // Chỉ bắt đầu ghi vị trí sau bước này, để trang 1 lúc mới mở không đè lên vị trí cũ.
  const [restored, setRestored] = useState(fromUrl !== null);
  useEffect(() => {
    if (fromUrl !== null) return;
    let alive = true;
    lastPage(slug)
      .then((n) => {
        if (!alive || !n || n <= 1 || (pages && n > pages)) return;
        setTarget(n);
        setResumedAt(n);
      })
      .catch(() => {})
      .finally(() => alive && setRestored(true));
    return () => {
      alive = false;
    };
  }, [fromUrl, slug, pages]);

  useEffect(() => {
    if (!restored) return;
    const t = setTimeout(() => rememberPage({ slug, page }).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [restored, slug, page]);

  const goTo = useCallback(
    (n: number) => {
      setResumedAt(null);
      const next = Math.min(Math.max(1, Math.round(n)), total);
      setPageInput(String(next));
      setTarget(next);
    },
    [total],
  );

  const zoomTo = useCallback((z: number) => setZoom(clampZoom(z)), []);
  const zoomStep = useCallback(
    (dir: 1 | -1) =>
      setZoom((z) => clampZoom(dir > 0 ? (STEPS.find((s) => s > z + 0.001) ?? MAX_ZOOM) : ([...STEPS].reverse().find((s) => s < z - 0.001) ?? MIN_ZOOM))),
    [],
  );
  const fitPage = useCallback(() => {
    if (base && stage.height) zoomTo(Math.min(1, (stage.height - 2 * GAP) / (base * aspect)));
  }, [base, stage.height, aspect, zoomTo]);

  // Phím tắt: ← → lật trang, + − phóng, 0 về vừa chiều ngang.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      // Đang gõ, hoặc đang dùng phím mũi tên trong menu Giao diện, Mục lục: để nguyên cho ô đó.
      const t = e.target instanceof Element ? e.target : null;
      if (
        t?.closest("input, textarea, select, [contenteditable], [role=radiogroup], [role=slider]") ||
        t?.closest('[data-slot="popover-content"], [data-slot="sheet-content"], [data-slot="dropdown-menu-content"]')
      )
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(page + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(page - 1);
      } else if (e.key === "+" || e.key === "=") {
        zoomStep(1);
      } else if (e.key === "-") {
        zoomStep(-1);
      } else if (e.key === "0") {
        zoomTo(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page, zoomStep, zoomTo]);

  // Ctrl + cuộn chuột (hoặc chụm hai ngón trên touchpad) để phóng tài liệu, thay cho phóng cả trang web.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z * Math.exp(-e.deltaY * 0.002)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Chụm hai ngón trên màn hình cảm ứng để phóng tài liệu. Khung cuộn đặt touch-action: pan-x pan-y nên trình duyệt
  // không tự phóng cả trang web; ở đây đổi mức phóng theo tỷ lệ khoảng cách hai ngón so với lúc bắt đầu chụm.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let pinch: { dist: number; zoom: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { dist: dist(e.touches), zoom: zoomRef.current };
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      setZoom(clampZoom(pinch.zoom * (dist(e.touches) / pinch.dist)));
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  // Trình đọc có sẵn nút hỏi trợ lý; ẩn cụm nút nổi góc phải để không che thanh dưới và trang PDF trên màn hình hẹp.
  useEffect(() => {
    document.documentElement.dataset.pdfReader = "";
    return () => {
      delete document.documentElement.dataset.pdfReader;
    };
  }, []);

  // Chỉ vẽ các trang trong vùng nhìn và vài trang lân cận.
  const first = span ? Math.max(1, Math.floor(scrollTop / span) + 1 - OVERSCAN) : 1;
  const last = span ? Math.min(total, Math.ceil((scrollTop + stage.height) / span) + OVERSCAN) : 1;

  const current = chapters.find((c) => page >= c.from && page <= c.to);
  const links = current && practice[current.number];


  const notesByPage = new Map<number, ReaderNote[]>();
  for (const n of docNotes.notes) if (n.pdfPage) notesByPage.set(n.pdfPage, [...(notesByPage.get(n.pdfPage) ?? []), n]);

  // Tô các đoạn đã ghi chú trên lớp chữ của những trang đang vẽ. Gọi lại mỗi khi một lớp chữ dựng xong.
  const notesRef = useRef(docNotes.notes);
  useLayoutEffect(() => {
    notesRef.current = docNotes.notes;
  }, [docNotes.notes]);
  const repaint = useCallback(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const groups = [...stageEl.querySelectorAll<HTMLElement>("[data-page]")].flatMap((el) => {
      const layer = el.querySelector(".textLayer");
      const onPage = notesRef.current.filter((n) => n.pdfPage === Number(el.dataset.page));
      return layer && onPage.length ? [{ root: layer, notes: onPage }] : [];
    });
    paintNotes(groups);
    const pending = revealRef.current;
    const layer = pending && stageEl.querySelector(`[data-page="${pending.pdfPage}"] .textLayer`);
    if (pending && layer && revealNote(layer, pending)) revealRef.current = null;
  }, []);
  useEffect(repaint, [docNotes.notes, repaint]);

  const resolveSelection = useCallback(
    (range: Range): NoteAnchor | null => {
      const start = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
      const pageEl = start?.closest<HTMLElement>("[data-page]");
      const layer = pageEl?.querySelector(".textLayer");
      const ctx = layer && anchorFromRange(layer, range);
      if (!pageEl || !ctx) return null;
      const n = Number(pageEl.dataset.page);
      return { ...ctx, pdfPage: n, chapter: chapters.find((c) => n >= c.from && n <= c.to)?.number ?? null };
    },
    [chapters],
  );

  const openNote = (n: ReaderNote) => {
    if (!n.pdfPage) return;
    revealRef.current = n;
    goTo(n.pdfPage);
    // Trang đã vẽ sẵn thì tô ngay; nếu chưa, repaint chạy khi lớp chữ của trang đó dựng xong.
    requestAnimationFrame(() => requestAnimationFrame(repaint));
  };

  const toc = chapters.length > 0 && (
    <nav aria-label="Mục lục" className="flex flex-col gap-1">
      {chapters.map((c) => {
        const active = current?.number === c.number;
        return (
          <button
            key={c.number}
            type="button"
            onClick={() => {
              goTo(c.from);
              setTocOpen(false);
            }}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
              active && "bg-primary-soft text-primary",
            )}
          >
            <span className="w-6 shrink-0 font-heading font-bold text-primary">{String(c.number).padStart(2, "0")}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="leading-snug">{c.title}</span>
              <span className="text-xs text-muted-foreground">
                Tr. {printedPage({ pageOffset }, c.from)}–{printedPage({ pageOffset }, c.to)}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div
      data-reader-theme={theme}
      role={immersive ? "dialog" : undefined}
      aria-modal={immersive || undefined}
      aria-label={immersive ? `Đọc: ${title}` : undefined}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background text-foreground",
        immersive ? "fixed inset-0 z-50" : "rounded-xl border",
      )}
    >
      {toc && (
        <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r p-3 xl:flex">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mục lục</p>
          {toc}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5 border-b px-2 py-2 sm:px-3">
          {toc && (
            <Sheet open={tocOpen} onOpenChange={setTocOpen}>
              <SheetTrigger render={<Button variant="outline" size="sm" className="xl:hidden" />}>
                <ListTree data-icon="inline-start" />
                Mục lục
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Mục lục</SheetTitle>
                </SheetHeader>
                <div className="px-2 pb-4">{toc}</div>
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Trang trước">
              <ChevronLeft />
            </Button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goTo(Number(pageInput) || page);
              }}
              className="flex items-center gap-1.5 text-sm"
            >
              <Input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
                onBlur={() => setPageInput(String(page))}
                inputMode="numeric"
                aria-label="Trang PDF"
                className="h-8 w-14 text-center"
              />
              <span className="whitespace-nowrap text-muted-foreground">/ {numPages ?? "…"}</span>
            </form>
            <Button variant="ghost" size="icon-sm" onClick={() => goTo(page + 1)} disabled={!!numPages && page >= numPages} aria-label="Trang sau">
              <ChevronRight />
            </Button>
          </div>

          {pageOffset !== 0 && printedPage({ pageOffset }, page) > 0 && (
            <span className="hidden text-xs text-muted-foreground md:inline">Trang in {printedPage({ pageOffset }, page)}</span>
          )}
          {current && <span className="hidden max-w-64 truncate text-xs text-muted-foreground lg:inline">· Chương {current.number}</span>}

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => zoomStep(-1)} disabled={zoom <= MIN_ZOOM} aria-label="Thu nhỏ (phím −)">
              <Minus />
            </Button>
            <span className="w-12 text-center text-sm tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon-sm" onClick={() => zoomStep(1)} disabled={zoom >= MAX_ZOOM} aria-label="Phóng to (phím +)">
              <Plus />
            </Button>
            <Tooltip>
              <TooltipTrigger render={<Button variant={zoom === 1 ? "secondary" : "ghost"} size="icon-sm" onClick={() => zoomTo(1)} aria-label="Vừa chiều ngang" />}>
                <ArrowLeftRight />
              </TooltipTrigger>
              <TooltipContent>Vừa chiều ngang (phím 0)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={fitPage} aria-label="Vừa cả trang" />}>
                <ArrowUpDown />
              </TooltipTrigger>
              <TooltipContent>Vừa cả trang</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <NotesPanel
              notes={docNotes.notes}
              signedIn={docNotes.signedIn}
              onOpen={openNote}
              onUpdate={docNotes.update}
              onRemove={docNotes.remove}
              locationLabel={(n) => (n.pdfPage ? (pageOffset ? `Trang in ${printedPage({ pageOffset }, n.pdfPage)}` : `Trang ${n.pdfPage}`) : null)}
            />
            <ReaderSettingsMenu text={false} />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={immersive ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setImmersive((v) => !v)}
                    aria-label={immersive ? "Thoát chế độ đọc (Esc)" : "Chế độ đọc toàn màn hình"}
                    aria-pressed={immersive}
                  />
                }
              >
                {immersive ? <Minimize2 /> : <Maximize2 />}
              </TooltipTrigger>
              <TooltipContent>{immersive ? "Thoát chế độ đọc (Esc)" : "Chế độ đọc toàn màn hình"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="ghost" size="icon-sm" render={<a href={fileUrl} target="_blank" rel="noreferrer" />} nativeButton={false} aria-label="Mở bằng trình xem của trình duyệt" />}
              >
                <ExternalLink />
              </TooltipTrigger>
              <TooltipContent>Mở bằng trình xem của trình duyệt</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="ghost" size="icon-sm" render={<a href={`${fileUrl}?tai=1`} />} nativeButton={false} aria-label="Tải về" />}
              >
                <Download />
              </TooltipTrigger>
              <TooltipContent>Tải về</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div ref={stageRef} onScroll={onScroll} className="relative min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-subtle">
          <Document
            file={fileUrl}
            onLoadSuccess={(pdf) => {
              setNumPages(pdf.numPages);
              setReady(true);
              pdf
                .getPage(1)
                .then((p) => {
                  const v = p.getViewport({ scale: 1 });
                  setAspect(v.height / v.width);
                })
                .catch(() => {});
            }}
            loading={<Status icon><span>Đang mở {title}…</span></Status>}
            error={<Status>Không mở được tài liệu. Thử tải về hoặc mở bằng trình xem của trình duyệt.</Status>}
          >
            {base > 0 && numPages && (
              <div className="relative" style={{ width: Math.max(pageW + 2 * GAP, stage.width), height: numPages * span + GAP }}>
                {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((n) => (
                  <PageSlot
                    key={n}
                    n={n}
                    top={GAP + (n - 1) * span}
                    width={pageW}
                    height={pageH}
                    renderWidth={renderW}
                    dpr={dpr}
                    filter={PAGE_FILTER[theme]}
                    notes={notesByPage.get(n)?.length ?? 0}
                    onTextLayer={repaint}
                  />
                ))}
              </div>
            )}
          </Document>
          <SelectionMenu
            rootRef={stageRef}
            resolve={resolveSelection}
            target={{ source: "thu-vien", slug }}
            subject={subject}
            signedIn={docNotes.signedIn}
            onSaved={docNotes.add}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1.5 lg:flex">
            <ScanLine className="size-3.5" />
            ← → lật trang · Ctrl + cuộn chuột để phóng
          </span>
          <span className="min-w-0 flex-1 truncate">
            {resumedAt ? "Mở lại trang đọc lần trước. " : ""}
            {current ? `Chương ${current.number}: ${current.title}` : title}
          </span>
          {current && (
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="xs" render={<Link href={`/tro-ly?mon=${subject}&che-do=qa&chuong=${current.number}`} />} nativeButton={false}>
                <MessageSquareText data-icon="inline-start" />
                Hỏi trợ lý chương {current.number}
              </Button>
              {links?.quiz && (
                <Button variant="ghost" size="xs" render={<Link href={reviewHref(subject, current.number, "trac-nghiem")} />} nativeButton={false}>
                  <ListChecks data-icon="inline-start" />
                  Trắc nghiệm
                </Button>
              )}
              {links?.cards && (
                <Button variant="ghost" size="xs" render={<Link href={reviewHref(subject, current.number, "the-ghi-nho")} />} nativeButton={false}>
                  <GalleryVerticalEnd data-icon="inline-start" />
                  Thẻ ghi nhớ
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Một trang trong ô cố định kích thước. Bản vẽ được co giãn bằng CSS cho khớp ô; khi mức vẽ đổi,
 * bản mới vẽ ẩn phía trên bản cũ và chỉ thay khi đã vẽ xong, nên không chớp trắng.
 */
const PageSlot = memo(function PageSlot({
  n, top, width, height, renderWidth, dpr, filter, notes, onTextLayer,
}: {
  n: number; top: number; width: number; height: number; renderWidth: number; dpr: number; filter?: string;
  /** Số ghi chú trên trang, hiện dấu ở góc trang. */
  notes: number;
  onTextLayer: () => void;
}) {
  /** Độ rộng của bản vẽ đã hoàn tất gần nhất. */
  const [shown, setShown] = useState<number | null>(null);
  const layers = shown !== null && shown !== renderWidth ? [shown, renderWidth] : [renderWidth];
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-sm shadow-[0_1px_3px_rgb(0_0_0/0.12),0_8px_24px_-12px_rgb(0_0_0/0.25)]"
      style={{ top, width, height }}
      aria-label={`Trang ${n}`}
      data-page={n}
    >
      {/* Bộ lọc màu đặt ở lớp trong để bóng đổ của trang không bị đảo màu theo. */}
      <div className="absolute inset-0 bg-white" style={{ filter }}>
      {shown === null && (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/60">{n}</span>
      )}
      {layers.map((w) => (
        <div
          key={w}
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `scale(${width / w})`, opacity: layers.length > 1 && w === renderWidth ? 0 : 1 }}
        >
          <Page
            pageNumber={n}
            width={w}
            devicePixelRatio={dpr}
            renderAnnotationLayer={false}
            // Lớp chữ (để bôi đen, sao chép) chỉ dựng cho bản vẽ đang dùng.
            renderTextLayer={w === renderWidth}
            loading={null}
            onRenderSuccess={() => setShown(w)}
            onRenderTextLayerSuccess={onTextLayer}
          />
        </div>
      ))}
      </div>
      {notes > 0 && (
        <span
          className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow"
          aria-label={`${notes} ghi chú trên trang này`}
        >
          <NotebookPen className="size-3" />
          {notes}
        </span>
      )}
    </div>
  );
});

function Status({ children, icon }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <div className="flex min-h-80 items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
      {icon && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </div>
  );
}
