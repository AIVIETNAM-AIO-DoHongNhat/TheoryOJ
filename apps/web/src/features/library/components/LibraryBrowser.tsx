"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { DOC_KINDS, type DocKind, docMeta, KIND_LABELS, type LibraryDoc, printedPage, readerHref } from "../types";
import { DocCover, KIND_COLORS } from "./DocCover";

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

function DocCard({ doc }: { doc: LibraryDoc }) {
  const subject = getSubject(doc.subject);
  const chapters = doc.kind === "giao_trinh" ? doc.chapters : [];
  return (
    <li
      className={cn(
        "group relative flex gap-4 rounded-xl border bg-card p-4 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-card sm:gap-5 sm:p-5",
        chapters.length > 0 && "md:col-span-2",
      )}
    >
      <DocCover doc={doc} className="w-[76px] sm:w-[92px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Loại tài liệu đã có ở tiêu đề nhóm và trên bìa, ở đây chỉ ghi môn khi có nhiều môn. */}
        {MULTI_SUBJECT && (
          <span className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", KIND_COLORS[doc.kind].text)}>{subject?.shortName}</span>
        )}
        {/* Cả thẻ bấm được nhờ lớp phủ của liên kết tiêu đề; liên kết chương nằm trên lớp phủ. */}
        <Link
          href={`/thu-vien/${doc.slug}`}
          className="line-clamp-3 text-[15px] font-medium leading-snug after:absolute after:inset-0 after:rounded-xl group-hover:text-primary"
        >
          {doc.title}
        </Link>
        <p className="text-xs text-muted-foreground">{docMeta(doc)}</p>
        {doc.relatedChapters.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Liên quan</span>
            {doc.relatedChapters.map((n) => (
              <Badge key={n} variant="outline">Chương {n}</Badge>
            ))}
          </div>
        )}
        {chapters.length > 0 && (
          <ul className="relative z-10 mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c) => (
              <li key={c.number}>
                <Link
                  href={readerHref(doc.file, c.from)}
                  className="flex h-full items-start gap-2.5 rounded-lg border bg-subtle px-3 py-2 text-[13px] transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <span className="font-heading text-base font-bold leading-tight text-primary">{String(c.number).padStart(2, "0")}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 leading-snug">{c.title}</span>
                    <span className="text-xs text-muted-foreground">
                      tr. {printedPage(doc, c.from)}–{printedPage(doc, c.to)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function LibraryBrowser({ docs }: { docs: LibraryDoc[] }) {
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const present = DOC_KINDS.filter((k) => docs.some((d) => d.kind === k));

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

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        {MULTI_SUBJECT && (
          <ToggleGroup multiple value={subjects} onValueChange={setSubjects} variant="chip" spacing={1.5} aria-label="Lọc theo môn" className="flex-wrap">
            {ACTIVE_SUBJECTS.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} className="rounded-full px-3.5">
                {s.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ToggleGroup
            multiple
            value={kinds}
            onValueChange={setKinds}
            variant="chip"
            spacing={1.5}
            aria-label="Lọc theo loại tài liệu"
            className="flex-wrap"
          >
            {present.map((k) => (
              <ToggleGroupItem key={k} value={k} className="rounded-full px-3.5">
                <span aria-hidden className={cn("size-2 rounded-full", KIND_COLORS[k].bg)} />
                {KIND_LABELS[k]}
                <span className="text-xs opacity-60">{docs.filter((d) => d.kind === k).length}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <InputGroup className="bg-card md:max-w-xs">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc số hiệu" aria-label="Tìm tài liệu" />
          </InputGroup>
        </div>
      </div>

      {groups.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyTitle>Không có tài liệu phù hợp</EmptyTitle>
            <EmptyDescription>Thử bỏ bộ lọc hoặc tìm bằng từ khác.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span aria-hidden className={cn("mt-1 h-10 w-1 shrink-0 rounded-full", KIND_COLORS[g.kind].bg)} />
              <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  {KIND_LABELS[g.kind]}
                  <Badge variant="outline">{g.docs.length}</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">{KIND_HINTS[g.kind]}</p>
              </div>
            </div>
            <ul className="grid gap-4 md:grid-cols-2">
              {g.docs.map((d) => (
                <DocCard key={d.slug} doc={d} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
