"use client";

import { ArrowLeft, BookOpen, Download, FilePlus2, Pin, PinOff, Search, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { createPage, exportNotebook, loadPage, movePage, pinNotebook, pinPage, removePage, searchPages } from "../actions";
import {
  NOTEBOOK_COLORS, type Notebook, type NotebookColor, notebookHref, type NotebookIconId, type NotebookPage, type PageOrder,
  type PageSummary, plainExcerpt, UNTITLED_PAGE,
} from "../types";
import { NotebookCover } from "./NotebookCover";
import { NotebookSettingsDialog } from "./NotebookSettingsDialog";
import { type EditorHandle, PageEditor, type PagePatch } from "./PageEditor";

/** Cùng thứ tự với server/notebooks.ts: trang ghim trước, rồi theo cách xếp của sổ. */
function sortPages(list: PageSummary[], order: PageOrder): PageSummary[] {
  const key: Record<PageOrder, (a: PageSummary, b: PageSummary) => number> = {
    "moi-sua": (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    "moi-tao": (a, b) => b.createdAt.localeCompare(a.createdAt),
    "cu-truoc": (a, b) => a.createdAt.localeCompare(b.createdAt),
    ten: (a, b) => a.title.localeCompare(b.title, "vi") || a.createdAt.localeCompare(b.createdAt),
  };
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || key[order](a, b));
}

const dateOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/**
 * Màn làm việc của một sổ: danh sách trang bên trái (tìm, tạo, ghim), trang đang mở bên phải.
 * Trang đã mở được giữ trong bộ nhớ để chuyển qua lại tức thì và không đọc lại bản cũ khi lần lưu cuối chưa xong.
 * Màn hẹp chỉ hiện một trong hai: danh sách hoặc trang.
 */
export function NotebookWorkspace({
  notebook,
  initialPages,
  initialPage,
  openedFromUrl,
  otherNotebooks,
}: {
  notebook: Notebook;
  initialPages: PageSummary[];
  initialPage: NotebookPage | null;
  /** Đường dẫn có ?trang=: màn hẹp mở thẳng trang đó. */
  openedFromUrl: boolean;
  otherNotebooks: { id: number; title: string; color: NotebookColor; icon: NotebookIconId }[];
}) {
  const [pages, setPages] = useState(initialPages);
  const [current, setCurrent] = useState<NotebookPage | null>(initialPage);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "page">(openedFromUrl && initialPage ? "page" : "list");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PageSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pinned, setPinned] = useState(notebook.pinned);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cache = useRef(new Map<number, NotebookPage>(initialPage ? [[initialPage.id, initialPage]] : []));
  const wanted = useRef<number | null>(initialPage?.id ?? null);
  const editor = useRef<EditorHandle>(null);

  const order = notebook.pageOrder;
  const shown = useMemo(() => sortPages(results ?? pages, order), [results, pages, order]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  // Tìm trong toàn văn trên máy chủ (danh sách chỉ có đoạn đầu), chờ ngừng gõ.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- xóa ô tìm thì về danh sách đầy đủ
      setResults(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      setSearching(true);
      searchPages(notebook.id, q)
        .then((r) => alive && setResults(r))
        .catch(() => alive && setFlash("Chưa tìm được. Thử lại sau ít phút."))
        .finally(() => alive && setSearching(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, notebook.id]);

  const showUrl = (id: number | null) => window.history.replaceState(null, "", notebookHref(notebook.id, id));

  const open = (id: number) => {
    setView("page");
    if (id === current?.id) return;
    wanted.current = id;
    showUrl(id);
    const cached = cache.current.get(id);
    if (cached) {
      setCurrent(cached);
      return;
    }
    setLoadingId(id);
    loadPage(id)
      .then((p) => {
        cache.current.set(id, p);
        if (wanted.current === id) setCurrent(p);
      })
      .catch(() => setFlash("Không mở được trang này."))
      .finally(() => setLoadingId((x) => (x === id ? null : x)));
  };

  const onChange = useCallback((id: number, patch: PagePatch) => {
    const prev = cache.current.get(id);
    if (prev) cache.current.set(id, { ...prev, ...patch, updatedAt: patch.updatedAt ?? prev.updatedAt });
    const now = patch.updatedAt ?? new Date().toISOString();
    const apply = (list: PageSummary[]) =>
      list.map((p) => (p.id === id ? { ...p, title: patch.title, excerpt: plainExcerpt(patch.body), chapter: patch.chapter, updatedAt: now } : p));
    setPages(apply);
    setResults((r) => r && apply(r));
  }, []);

  const addPage = () =>
    startTransition(async () => {
      try {
        await editor.current?.flush();
        const p = await createPage({ notebookId: notebook.id });
        cache.current.set(p.id, p);
        setPages((list) => [p, ...list]);
        setQuery("");
        wanted.current = p.id;
        setCurrent(p);
        setView("page");
        showUrl(p.id);
      } catch (e) {
        setFlash(e instanceof Error ? e.message : "Chưa tạo được trang.");
      }
    });

  const forget = (id: number) => {
    cache.current.delete(id);
    const rest = pages.filter((p) => p.id !== id);
    setPages(rest);
    setResults((r) => r && r.filter((p) => p.id !== id));
    if (current?.id === id) {
      setCurrent(null);
      wanted.current = null;
      setView("list");
      showUrl(null);
    }
  };

  const onPin = async (id: number, value: boolean) => {
    try {
      await pinPage(id, value);
      const apply = (list: PageSummary[]) => list.map((p) => (p.id === id ? { ...p, pinned: value } : p));
      setPages(apply);
      setResults((r) => r && apply(r));
      const c = cache.current.get(id);
      if (c) cache.current.set(id, { ...c, pinned: value });
      setCurrent((c) => (c?.id === id ? { ...c, pinned: value } : c));
    } catch {
      setFlash("Chưa ghim được trang.");
    }
  };

  const onMove = async (id: number, notebookId: number) => {
    try {
      await movePage(id, notebookId);
      forget(id);
      setFlash(`Đã chuyển trang sang sổ “${otherNotebooks.find((n) => n.id === notebookId)?.title ?? ""}”.`);
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Chưa chuyển được trang.");
    }
  };

  const onDelete = async (id: number) => {
    try {
      await removePage(id);
      forget(id);
      setFlash("Đã xóa trang.");
    } catch {
      setFlash("Chưa xóa được trang.");
    }
  };

  const download = () =>
    startTransition(async () => {
      try {
        await editor.current?.flush();
        const { filename, markdown } = await exportNotebook(notebook.id);
        const a = Object.assign(document.createElement("a"), {
          href: URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" })),
          download: filename,
        });
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        setFlash("Chưa tải được sổ.");
      }
    });

  const togglePin = async () => {
    const next = !pinned;
    setPinned(next);
    try {
      await pinNotebook(notebook.id, next);
    } catch {
      setPinned(!next);
    }
  };

  return (
    <div className="mx-auto grid h-[calc(100dvh-4.25rem)] max-w-[96rem] grid-cols-1 lg:grid-cols-[19rem_1fr]">
      <aside className={cn("flex min-h-0 flex-col border-r bg-background", view === "page" && "hidden lg:flex")}>
        <div className="flex flex-col gap-3 border-b p-4" style={{ backgroundColor: NOTEBOOK_COLORS[notebook.color].soft }}>
          <Link href="/so-ghi-chep" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-3.5" />
            Tất cả sổ ghi chép
          </Link>
          <div className="flex items-center gap-3">
            <NotebookCover color={notebook.color} icon={notebook.icon} />
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="truncate font-heading text-lg leading-tight font-bold" title={notebook.title}>
                {notebook.title}
              </h1>
              <span className="text-xs text-muted-foreground">{pages.length} trang</span>
            </div>
          </div>
          {notebook.description && <p className="line-clamp-2 text-xs text-muted-foreground">{notebook.description}</p>}
          <div className="flex items-center gap-1">
            <NotebookSettingsDialog
              notebook={{ ...notebook, pageCount: pages.length }}
              trigger={
                <Button variant="outline" size="sm" className="bg-card">
                  <Settings2 data-icon="inline-start" />
                  Tùy chỉnh
                </Button>
              }
            />
            <Button variant="ghost" size="icon-sm" onClick={download} disabled={pending || !pages.length} aria-label="Tải cả sổ (.md)" title="Tải cả sổ (.md)">
              <Download />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={togglePin} aria-pressed={pinned} aria-label={pinned ? "Bỏ ghim sổ" : "Ghim sổ lên đầu"} title={pinned ? "Bỏ ghim sổ" : "Ghim sổ lên đầu"}>
              {pinned ? <PinOff /> : <Pin />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} placeholder="Tìm trong sổ" aria-label="Tìm trong sổ" className="h-8 pr-7 pl-8" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Xóa ô tìm" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {searching ? <Spinner className="size-3.5" /> : <X className="size-3.5" />}
              </button>
            )}
          </div>
          <Button size="sm" onClick={addPage} disabled={pending} aria-label="Trang mới">
            {pending ? <Spinner data-icon="inline-start" /> : <FilePlus2 data-icon="inline-start" />}
            Trang
          </Button>
        </div>

        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
          {shown.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {results ? `Không có trang nào chứa “${query.trim()}”.` : "Sổ chưa có trang nào."}
            </li>
          )}
          {shown.map((p) => {
            const active = p.id === current?.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => open(p.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted",
                    active && "bg-primary-soft hover:bg-primary-soft",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {p.pinned && <Pin className="size-3 shrink-0 text-primary" aria-label="Đã ghim" />}
                    <span className={cn("truncate text-sm font-medium", active && "text-primary", !p.title && "text-muted-foreground italic")}>
                      {p.title || UNTITLED_PAGE}
                    </span>
                    {loadingId === p.id && <Spinner className="ml-auto size-3" />}
                  </span>
                  {p.excerpt && <span className="line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</span>}
                  <span className="flex gap-2 text-[11px] text-muted-foreground/80">
                    <time dateTime={p.updatedAt}>{dateOf(p.updatedAt)}</time>
                    {p.chapter && <span>· Chương {p.chapter}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className={cn("min-h-0", view === "list" && "hidden lg:block")}>
        {current ? (
          <PageEditor
            key={current.id}
            ref={editor}
            page={current}
            notebookSubject={notebook.subject}
            paper={notebook.paper}
            fontSize={notebook.fontSize}
            otherNotebooks={otherNotebooks}
            onChange={onChange}
            onPin={onPin}
            onMove={onMove}
            onDelete={onDelete}
            onBack={() => setView("list")}
          />
        ) : loadingId ? (
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-subtle p-6">
            <Empty className="max-w-md border bg-card py-12">
              <EmptyHeader>
                <EmptyMedia className="size-14 rounded-2xl bg-primary-soft text-primary [&_svg:not([class*='size-'])]:size-6">
                  <FilePlus2 />
                </EmptyMedia>
                <EmptyTitle>{pages.length ? "Chọn một trang để đọc tiếp" : "Viết trang đầu tiên"}</EmptyTitle>
                <EmptyDescription>
                  Ghi lại ý chính sau mỗi bài, công thức cần nhớ, câu hỏi để hỏi giảng viên. Khi đọc giáo trình, bôi đen một đoạn rồi chọn “Vào sổ” để chép kèm số trang.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-row flex-wrap justify-center">
                <Button onClick={addPage} disabled={pending}>
                  <FilePlus2 data-icon="inline-start" />
                  Trang mới
                </Button>
                <Button variant="outline" render={<Link href="/thu-vien" />} nativeButton={false}>
                  <BookOpen data-icon="inline-start" />
                  Mở giáo trình
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        )}
      </section>

      {flash && (
        <div role="status" className="fixed bottom-6 left-1/2 z-70 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-float">
          {flash}
        </div>
      )}
    </div>
  );
}
