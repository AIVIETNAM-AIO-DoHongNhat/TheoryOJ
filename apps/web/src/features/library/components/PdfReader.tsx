"use client";

import "react-pdf/dist/Page/TextLayer.css";

import {
  ChevronLeft, ChevronRight, Download, ExternalLink, ListTree, LoaderCircle, Minus, Plus, ScanLine,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { type DocChapter, printedPage } from "../types";

// Worker phải khai báo trong cùng module với <Document> (README của react-pdf).
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const ZOOMS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

export interface PdfReaderProps {
  slug: string;
  title: string;
  pages: number | null;
  pageOffset: number;
  chapters: DocChapter[];
}

function readPageFromUrl(max: number | null): number {
  const n = Number(new URLSearchParams(window.location.search).get("trang"));
  return Number.isInteger(n) && n >= 1 && (!max || n <= max) ? n : 1;
}

export function PdfReader({ slug, title, pages, pageOffset, chapters }: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number | null>(pages);
  // Trang ban đầu lấy từ ?trang=, để trích dẫn của trợ lý mở đúng chỗ. Component chỉ chạy ở client.
  const [page, setPage] = useState(() => readPageFromUrl(pages));
  const [pageInput, setPageInput] = useState(() => String(page));
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileUrl = `/api/tai-lieu/${slug}`;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback(
    (n: number) => {
      const max = numPages ?? 1;
      const next = Math.min(Math.max(1, Math.round(n)), max);
      setPage(next);
      setPageInput(String(next));
      const url = new URL(window.location.href);
      url.searchParams.set("trang", String(next));
      window.history.replaceState(null, "", url);
      stageRef.current?.scrollTo({ top: 0 });
    },
    [numPages],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") goTo(page + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page]);

  const current = chapters.find((c) => page >= c.from && page <= c.to);
  const zoomIndex = ZOOMS.indexOf(zoom);
  // Khổ trang vừa khung, tối đa 900px ở mức 100 %.
  const pageWidth = width ? Math.min(width - 32, 900) * zoom : undefined;

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
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border bg-white">
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
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom(ZOOMS[zoomIndex - 1])} disabled={zoomIndex <= 0} aria-label="Thu nhỏ">
              <Minus />
            </Button>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="sm" onClick={() => setZoom(1)} className="w-14 tabular-nums" />}>
                {Math.round(zoom * 100)}%
              </TooltipTrigger>
              <TooltipContent>Vừa khung</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom(ZOOMS[zoomIndex + 1])} disabled={zoomIndex >= ZOOMS.length - 1} aria-label="Phóng to">
              <Plus />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
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

        <div ref={stageRef} className="min-h-0 flex-1 overflow-auto bg-subtle">
          <div className="flex min-w-fit justify-center p-4">
            <Document
              file={fileUrl}
              suspense={false}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={<Status icon><span>Đang mở {title}…</span></Status>}
              error={<Status>Không mở được tài liệu. Thử tải về hoặc mở bằng trình xem của trình duyệt.</Status>}
            >
              {pageWidth && (
                <Page
                  key={page}
                  pageNumber={page}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  loading={<div style={{ width: pageWidth, height: pageWidth * 1.414 }} className="bg-white" />}
                  className="overflow-hidden rounded-sm shadow-[0_1px_3px_rgb(0_0_0/0.12),0_8px_24px_-12px_rgb(0_0_0/0.25)]"
                />
              )}
            </Document>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <ScanLine className="size-3.5" />
            Phím ← → để lật trang
          </span>
          <span className="truncate">{current ? `Chương ${current.number}: ${current.title}` : title}</span>
        </div>
      </div>
    </div>
  );
}

function Status({ children, icon }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <div className="flex min-h-80 items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
      {icon && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </div>
  );
}
