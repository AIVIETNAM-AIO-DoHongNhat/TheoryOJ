"use client";

import {
  ArrowLeft, Bold, Check, CircleAlert, Columns2, Download, Ellipsis, Eye, FolderInput, Heading2, Italic, List, ListOrdered,
  PenLine, Pin, PinOff, Quote, Sigma, Trash2,
} from "lucide-react";
import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { getSubject } from "@/config/subjects";
import { errorMessage, unwrap } from "@/lib/action-result";
import { cn } from "@/lib/utils";

import { savePage } from "../actions";
import { applyFormat, type FormatKind, wordCount } from "../format";
import {
  FONT_SIZES, type FontSize, type NotebookColor, type NotebookIconId, type NotebookPage, PAGE_BODY_MAX, PAGE_TITLE_MAX,
  type PaperStyle, UNTITLED_PAGE,
} from "../types";
import { NotebookCover } from "./NotebookCover";

export type ViewMode = "viet" | "xem" | "doi";
const MODE_KEY = "so-ghi-chep:che-do";
const SAVE_DELAY = 900;
const NO_CHAPTER = "0";

/** Thay đổi của trang chưa lưu hoặc vừa lưu, để danh sách bên trái cập nhật ngay. */
export interface PagePatch {
  title: string;
  body: string;
  subject: string | null;
  chapter: number | null;
  updatedAt?: string;
}

export interface EditorHandle {
  /** Lưu ngay phần đang gõ dở (trước khi tải sổ về). */
  flush: () => Promise<void>;
}

type Status = { kind: "saved"; at: string } | { kind: "dirty" } | { kind: "saving" } | { kind: "error"; message: string };

const TOOLS: { kind: FormatKind; icon: typeof Bold; label: string; keys?: string }[] = [
  { kind: "bold", icon: Bold, label: "Chữ đậm", keys: "Ctrl+B" },
  { kind: "italic", icon: Italic, label: "Chữ nghiêng", keys: "Ctrl+I" },
  { kind: "heading", icon: Heading2, label: "Tiêu đề mục" },
  { kind: "bullet", icon: List, label: "Gạch đầu dòng" },
  { kind: "numbered", icon: ListOrdered, label: "Đánh số" },
  { kind: "quote", icon: Quote, label: "Trích dẫn" },
  { kind: "math", icon: Sigma, label: "Công thức ($…$)" },
];

const MODES: { id: ViewMode; icon: typeof Eye; label: string }[] = [
  { id: "viet", icon: PenLine, label: "Viết" },
  { id: "doi", icon: Columns2, label: "Song song" },
  { id: "xem", icon: Eye, label: "Xem" },
];

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("viet");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc lựa chọn đã lưu sau khi hydrate
      if (saved === "viet" || saved === "xem" || saved === "doi") setMode(saved);
    } catch {}
  }, []);
  const set = useCallback((m: ViewMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  }, []);
  return [mode, set];
}

/**
 * Một trang của sổ: tiêu đề, chương, nội dung Markdown. Tự lưu sau khi ngừng gõ chừng một giây, khi rời trang,
 * và khi bấm Ctrl+S. Dựng lại theo `key` khi đổi trang, nên trạng thái gõ không lẫn giữa các trang.
 */
export function PageEditor({
  ref,
  page,
  notebookSubject,
  paper,
  fontSize,
  otherNotebooks,
  onChange,
  onPin,
  onMove,
  onDelete,
  onBack,
}: {
  ref?: Ref<EditorHandle>;
  page: NotebookPage;
  notebookSubject: string | null;
  paper: PaperStyle;
  fontSize: FontSize;
  otherNotebooks: { id: number; title: string; color: NotebookColor; icon: NotebookIconId }[];
  onChange: (id: number, patch: PagePatch) => void;
  onPin: (id: number, pinned: boolean) => void;
  onMove: (id: number, notebookId: number) => void;
  onDelete: (id: number) => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [chapter, setChapter] = useState(page.chapter);
  const [status, setStatus] = useState<Status>({ kind: "saved", at: page.updatedAt });
  const [mode, setMode] = useViewMode();
  const textRef = useRef<HTMLTextAreaElement>(null);

  const subjectId = notebookSubject ?? page.subject;
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const chapters = subject?.chapters ?? [];

  // Bản mới nhất để lưu, và cờ "còn thay đổi chưa lưu". Lưu nối tiếp nhau để bản sau không bị bản trước đè.
  const latest = useRef({ title, body, chapter });
  const dirty = useRef(false);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const save = useCallback(() => {
    chain.current = chain.current.then(async () => {
      if (!dirty.current) return;
      dirty.current = false;
      const snap = latest.current;
      setStatus({ kind: "saving" });
      try {
        const { updatedAt } = unwrap(await savePage({ id: page.id, ...snap, subject: subjectId }));
        if (dirty.current) setStatus({ kind: "dirty" });
        else setStatus({ kind: "saved", at: updatedAt });
        onChangeRef.current(page.id, { ...snap, subject: subjectId, updatedAt });
      } catch (e) {
        dirty.current = true;
        setStatus({ kind: "error", message: errorMessage(e, "Chưa lưu được.") });
      }
    });
    return chain.current;
  }, [page.id, subjectId]);

  useImperativeHandle(ref, () => ({ flush: save }), [save]);

  // Mỗi lần đổi nội dung: báo danh sách, hẹn lưu. So với bản gần nhất (không dùng cờ "lần đầu") vì StrictMode chạy effect hai lần.
  useEffect(() => {
    const l = latest.current;
    if (l.title === title && l.body === body && l.chapter === chapter) return;
    latest.current = { title, body, chapter };
    dirty.current = true;
    setStatus({ kind: "dirty" });
    onChangeRef.current(page.id, { title, body, chapter, subject: subjectId });
    const t = setTimeout(() => void save(), SAVE_DELAY);
    return () => clearTimeout(t);
  }, [title, body, chapter, page.id, subjectId, save]);

  // Đổi trang hoặc rời sổ khi chưa kịp lưu: lưu nốt. Đóng tab thì hỏi lại.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (dirty.current) void save();
    };
  }, [save]);

  const format = (kind: FormatKind) => {
    const ta = textRef.current;
    if (!ta) return;
    const e = applyFormat(ta.value, ta.selectionStart, ta.selectionEnd, kind);
    ta.focus();
    ta.setSelectionRange(e.from, e.to);
    // execCommand giữ được Ctrl+Z của trình duyệt; không có thì sửa thẳng giá trị.
    const ok = typeof document.execCommand === "function" && document.execCommand(e.insert ? "insertText" : "delete", false, e.insert);
    if (!ok) setBody((v) => v.slice(0, e.from) + e.insert + v.slice(e.to));
    ta.setSelectionRange(e.selStart, e.selEnd);
    requestAnimationFrame(() => ta.setSelectionRange(e.selStart, e.selEnd));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "s") {
      e.preventDefault();
      void save();
    } else if (k === "b" && e.target === textRef.current) {
      e.preventDefault();
      format("bold");
    } else if (k === "i" && e.target === textRef.current) {
      e.preventDefault();
      format("italic");
    }
  };

  const download = () => {
    const blob = new Blob([`# ${title || UNTITLED_PAGE}\n\n${body}\n`], { type: "text/markdown;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${(title || "trang").slice(0, 60)}.md` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const px = FONT_SIZES[fontSize].px;
  const paperStyle = { fontSize: px, "--dong": `${Math.round(px * 1.75)}px` } as React.CSSProperties;
  const words = wordCount(body);
  const nearLimit = body.length > PAGE_BODY_MAX * 0.9;

  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={onKeyDown}>
      <div className="flex flex-col gap-2 border-b bg-background px-3 pt-3 pb-2 sm:px-5">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon-sm" className="mt-1 lg:hidden" onClick={onBack} aria-label="Về danh sách trang">
            <ArrowLeft />
          </Button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={PAGE_TITLE_MAX}
            placeholder={UNTITLED_PAGE}
            aria-label="Tiêu đề trang"
            autoFocus={!page.title && !page.body}
            className="min-w-0 flex-1 bg-transparent font-heading text-2xl font-bold outline-none placeholder:text-muted-foreground/60"
          />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="mt-1" aria-label="Thao tác với trang" />}>
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onPin(page.id, !page.pinned)}>
                  {page.pinned ? <PinOff /> : <Pin />}
                  {page.pinned ? "Bỏ ghim" : "Ghim lên đầu sổ"}
                </DropdownMenuItem>
                {otherNotebooks.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput />
                      Chuyển sang sổ
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
                      <DropdownMenuLabel>Chọn sổ</DropdownMenuLabel>
                      {otherNotebooks.map((nb) => (
                        <DropdownMenuItem
                          key={nb.id}
                          onClick={async () => {
                            await save();
                            onMove(page.id, nb.id);
                          }}
                        >
                          <NotebookCover color={nb.color} icon={nb.icon} size="sm" />
                          <span className="truncate">{nb.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={download}>
                  <Download />
                  Tải trang (.md)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Xóa trang “${title || UNTITLED_PAGE}”? Không khôi phục được.`)) {
                    dirty.current = false;
                    onDelete(page.id);
                  }
                }}
              >
                <Trash2 />
                Xóa trang
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground lg:pl-0">
          {chapters.length > 0 && (
            <Select
              items={[{ value: NO_CHAPTER, label: "Không gắn chương" }, ...chapters.map((c) => ({ value: String(c.number), label: `Chương ${c.number}` }))]}
              value={String(chapter ?? NO_CHAPTER)}
              onValueChange={(v) => setChapter(!v || v === NO_CHAPTER ? null : Number(v))}
            >
              <SelectTrigger size="sm" className="h-7 border-dashed bg-transparent text-xs" aria-label="Chương">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_CHAPTER}>Không gắn chương</SelectItem>
                  {chapters.map((c) => (
                    <SelectItem key={c.number} value={String(c.number)}>
                      <span className="line-clamp-1">Chương {c.number}: {c.title}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          {page.pinned && (
            <span className="flex items-center gap-1 text-primary">
              <Pin className="size-3" />
              Đã ghim
            </span>
          )}
          <span aria-live="polite" className={cn("flex items-center gap-1", status.kind === "error" && "text-destructive")}>
            {status.kind === "saving" && (
              <>
                <Spinner className="size-3" />
                Đang lưu…
              </>
            )}
            {status.kind === "dirty" && "Chưa lưu"}
            {status.kind === "saved" && (
              <>
                <Check className="size-3 text-primary" />
                Đã lưu lúc {timeOf(status.at)}
              </>
            )}
            {status.kind === "error" && (
              <>
                <CircleAlert className="size-3" />
                {status.message}
                <button type="button" className="ml-1 font-medium underline" onClick={() => void save()}>
                  Thử lại
                </button>
              </>
            )}
          </span>
          <span className="ml-auto tabular-nums">
            {words.toLocaleString("vi-VN")} chữ
            {nearLimit && <span className="text-warn"> · {body.length.toLocaleString("vi-VN")}/{PAGE_BODY_MAX.toLocaleString("vi-VN")} ký tự</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 overflow-x-auto border-b bg-background px-2 py-1 sm:px-4">
        {TOOLS.map((t) => (
          <Button
            key={t.kind}
            variant="ghost"
            size="icon-sm"
            onClick={() => format(t.kind)}
            disabled={mode === "xem"}
            aria-label={t.label}
            title={t.keys ? `${t.label} (${t.keys})` : t.label}
          >
            <t.icon />
          </Button>
        ))}
        <div role="radiogroup" aria-label="Cách hiển thị" className="ml-auto flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-sm",
                m.id === "doi" && "hidden lg:flex",
              )}
            >
              <m.icon className="size-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid min-h-0 flex-1 bg-subtle", mode === "doi" ? "lg:grid-cols-2" : "grid-cols-1")}>
        {/* "Song song" chỉ có ở màn rộng; màn hẹp hiện như "Viết". */}
        {mode !== "xem" && (
          <div className={cn("flex min-h-0 justify-center", mode === "doi" && "lg:border-r")}>
            <textarea
              ref={textRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={PAGE_BODY_MAX}
              spellCheck={false}
              aria-label="Nội dung trang"
              placeholder={"Ghi lại điều đồng chí vừa học…\n\n## Ý chính\n- Gạch đầu dòng bằng dấu -\n- Công thức: $m' = \\frac{m}{v} \\times 100\\%$\n> Trích dẫn bằng dấu >"}
              style={paperStyle}
              className={cn(
                "giay-viet h-full w-full resize-none border-x px-5 outline-none placeholder:text-muted-foreground/55 sm:px-8",
                `giay-${paper}`,
                mode === "viet" && "max-w-3xl shadow-card",
              )}
            />
          </div>
        )}
        {mode !== "viet" && (
          <div className={cn("min-h-0 overflow-y-auto", mode === "doi" ? "hidden lg:block" : "flex justify-center")}>
            <div
              style={paperStyle}
              className={cn("giay-xem min-h-full w-full px-5 py-7 sm:px-8", `giay-${paper}`, mode === "xem" && "max-w-3xl border-x shadow-card")}
            >
              {body.trim() ? (
                <Markdown variant="notes">{body}</Markdown>
              ) : (
                <p className="text-muted-foreground">Trang trống. Chuyển sang “Viết” để ghi.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
