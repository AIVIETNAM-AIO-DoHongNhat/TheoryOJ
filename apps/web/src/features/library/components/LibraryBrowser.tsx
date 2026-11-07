"use client";

import { ArrowRight, ArrowUpRight, BookOpenText, Route, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { DOC_KINDS, type DocKind, docMeta, FORMAT_LABELS, KIND_LABELS, type LibraryDoc, printedPage, readerHref } from "../types";
import { DocCover, KIND_COLORS } from "./DocCover";
import { KIND_ICONS } from "./DocIcon";

/** Bỏ dấu để tìm "nghi quyet" vẫn ra "Nghị quyết". */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

// Lọc theo môn chỉ hiện khi Khoa đã mở từ hai môn trở lên.
const MULTI_SUBJECT = ACTIVE_SUBJECTS.length > 1;

const KIND_HINTS: Record<DocKind, string> = {
  giao_trinh: "Sách chính của môn, chia theo chương. Trợ lý trích dẫn theo trang của giáo trình.",
  van_kien: "Nghị quyết, báo cáo của Đảng, dùng khi liên hệ lý luận với chủ trương hiện hành.",
  tham_khao: "Sách hỏi đáp, bài nghiên cứu giúp hiểu sâu hơn các văn kiện và giáo trình.",
  cand: "Văn bản của lực lượng Công an nhân dân, dùng khi liên hệ với nhiệm vụ của ngành.",
  so_lieu: "Số liệu thống kê chính thức, dùng làm dẫn chứng khi phân tích thực tiễn.",
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "Kệ" màu nhạt theo loại tài liệu, có vệt sáng và vân chéo mảnh, để bìa giấy nổi lên thay vì chìm trong thẻ trắng.
 * Vân chéo dùng currentColor nên tự sáng lên ở giao diện tối.
 */
function Shelf({ kind, className, children }: { kind: DocKind; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative isolate flex items-center justify-center overflow-hidden", KIND_COLORS[kind].soft, className)}>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 text-foreground/5 [background-image:repeating-linear-gradient(135deg,currentColor_0_1px,transparent_1px_12px)] [mask-image:radial-gradient(90%_80%_at_50%_40%,#000,transparent)]"
      />
      <div aria-hidden className="absolute -top-1/2 left-1/2 -z-10 size-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.7),transparent)] dark:bg-[radial-gradient(closest-side,rgb(255_255_255/0.06),transparent)]" />
      {children}
    </div>
  );
}

/** Thẻ tài liệu thường: kệ màu có bìa ở trên, tên và thông tin ở dưới. Cả thẻ bấm được nhờ lớp phủ của liên kết tiêu đề. */
function DocCard({ doc }: { doc: LibraryDoc }) {
  const subject = getSubject(doc.subject);
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-float">
      <Shelf kind={doc.kind} className="h-48 border-b">
        <DocCover
          doc={doc}
          className="w-[104px] -rotate-3 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:rotate-0 group-hover:scale-[1.04]"
        />
        <span className="absolute top-3 right-3 rounded-full bg-card/85 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground ring-1 ring-foreground/5 backdrop-blur">
          {FORMAT_LABELS[doc.format]}
        </span>
      </Shelf>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {MULTI_SUBJECT && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{subject?.shortName}</span>
        )}
        <Link
          href={`/thu-vien/${doc.slug}`}
          className="line-clamp-3 text-[15px] font-semibold leading-snug text-balance transition-colors after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary"
        >
          {doc.title}
        </Link>
        <p className="text-xs text-muted-foreground">{docMeta(doc)}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {doc.relatedChapters.map((n) => (
              <span key={n} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Chương {n}
              </span>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
            Đọc
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </li>
  );
}

/** Giáo trình chia chương: thẻ rộng cả hàng, bìa lớn bên trái, danh sách chương mở thẳng tới trang trong trình đọc. */
function FeaturedDoc({ doc }: { doc: LibraryDoc }) {
  const subject = getSubject(doc.subject);
  return (
    <li className="col-span-full overflow-hidden rounded-3xl border bg-card shadow-card">
      <div className="grid md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]">
        <Shelf kind={doc.kind} className="border-b px-8 py-10 md:border-r md:border-b-0">
          <DocCover doc={doc} className="w-32 -rotate-2 sm:w-40 lg:w-44" />
        </Shelf>
        <div className="flex min-w-0 flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-col gap-2.5">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Giáo trình chính{subject ? ` · ${subject.shortName}` : ""}
            </span>
            <Link href={`/thu-vien/${doc.slug}`} className="text-balance text-xl font-bold leading-snug hover:text-primary sm:text-2xl">
              {doc.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {docMeta(doc)} · {doc.chapters.length} chương
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="px-4" render={<Link href={`/thu-vien/${doc.slug}`} />} nativeButton={false}>
              <BookOpenText data-icon="inline-start" />
              Đọc giáo trình
            </Button>
            {subject && (
              <Button size="lg" variant="outline" className="px-4" render={<Link href={`/mon/${subject.id}`} />} nativeButton={false}>
                <Route data-icon="inline-start" />
                Học theo lộ trình
              </Button>
            )}
          </div>
          <ol className="grid gap-2 sm:grid-cols-2" aria-label="Các chương">
            {doc.chapters.map((c) => (
              <li key={c.number}>
                <Link
                  href={readerHref(doc.file, c.from)}
                  className="group/ch flex h-full items-start gap-3 rounded-xl border bg-subtle p-3 transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card font-heading text-base font-bold tabular-nums text-primary ring-1 ring-primary/15 transition-colors group-hover/ch:bg-primary group-hover/ch:text-primary-foreground">
                    {pad(c.number)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 text-[13px] font-medium leading-snug">{c.title}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      tr. {printedPage(doc, c.from)}–{printedPage(doc, c.to)}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/ch:opacity-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </li>
  );
}

function SectionHeading({ kind, count }: { kind: DocKind; count: number }) {
  const Icon = KIND_ICONS[kind];
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-[0_8px_20px_-8px_rgb(0_0_0/0.45)]", KIND_COLORS[kind].bg)}>
        <Icon className="size-[22px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="flex items-baseline gap-2 text-xl font-bold sm:text-2xl">
          {KIND_LABELS[kind]}
          <span className="text-base font-medium tabular-nums text-muted-foreground">{count}</span>
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{KIND_HINTS[kind]}</p>
      </div>
    </div>
  );
}

export function LibraryBrowser({ docs }: { docs: LibraryDoc[] }) {
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const present = DOC_KINDS.filter((k) => docs.some((d) => d.kind === k));
  const filtered = query.trim() !== "" || kinds.length > 0 || subjects.length > 0;

  const groups = useMemo(() => {
    const q = fold(query.trim());
    const shown = docs.filter(
      (d) =>
        (!kinds.length || kinds.includes(d.kind)) &&
        (!subjects.length || subjects.includes(d.subject)) &&
        (!q || fold(`${d.title} ${d.code ?? ""}`).includes(q)),
    );
    return present.map((k) => ({ kind: k, docs: shown.filter((d) => d.kind === k) })).filter((g) => g.docs.length);
  }, [docs, kinds, subjects, query, present]);
  const shownCount = groups.reduce((a, g) => a + g.docs.length, 0);

  const reset = () => {
    setQuery("");
    setKinds([]);
    setSubjects([]);
  };

  return (
    <div className="flex flex-col gap-14">
      {/* Thanh lọc nổi lên mép dưới hero; màn rộng thì dính theo khi cuộn (ngay dưới đầu trang cao 68px). */}
      <div className="relative z-20 -mt-12 flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-float sm:-mt-14 md:sticky md:top-[76px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <InputGroup className="h-11 rounded-xl bg-background lg:max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc số hiệu (68-NQ/TW)" aria-label="Tìm tài liệu" />
            {query && (
              <InputGroupAddon align="inline-end">
                <button type="button" onClick={() => setQuery("")} aria-label="Xóa ô tìm" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
          <ToggleGroup
            multiple
            value={kinds}
            onValueChange={setKinds}
            variant="chip"
            spacing={1.5}
            aria-label="Lọc theo loại tài liệu"
            className="flex-1 flex-wrap"
          >
            {present.map((k) => (
              <ToggleGroupItem key={k} value={k} className="h-9 rounded-full px-3.5 aria-pressed:[&_[data-dot]]:bg-primary-foreground">
                <span data-dot aria-hidden className={cn("size-2 rounded-full", KIND_COLORS[k].bg)} />
                {KIND_LABELS[k]}
                <span className="text-xs tabular-nums opacity-60">{docs.filter((d) => d.kind === k).length}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={reset} className="self-start text-muted-foreground lg:self-auto">
              <X data-icon="inline-start" />
              Bỏ lọc ({shownCount})
            </Button>
          )}
        </div>
        {MULTI_SUBJECT && (
          <ToggleGroup multiple value={subjects} onValueChange={setSubjects} variant="chip" spacing={1.5} aria-label="Lọc theo môn" className="flex-wrap border-t pt-3">
            {ACTIVE_SUBJECTS.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} className="rounded-full px-3.5">
                {s.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      {groups.length === 0 ? (
        <Empty className="rounded-3xl border border-dashed py-20">
          <EmptyHeader>
            <EmptyTitle>Không có tài liệu phù hợp</EmptyTitle>
            <EmptyDescription>Thử bỏ bộ lọc hoặc tìm bằng từ khác.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={reset}>Bỏ lọc</Button>
        </Empty>
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="flex scroll-mt-40 flex-col gap-6" id={g.kind.replace("_", "-")}>
            <SectionHeading kind={g.kind} count={g.docs.length} />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.docs.map((d) => (d.kind === "giao_trinh" && d.chapters.length > 0 ? <FeaturedDoc key={d.slug} doc={d} /> : <DocCard key={d.slug} doc={d} />))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
