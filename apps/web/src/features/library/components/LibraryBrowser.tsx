"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { IconTile } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";

import { DOC_KINDS, type DocKind, docMeta, KIND_LABELS, type LibraryDoc } from "../types";
import { KIND_ICONS } from "./DocIcon";

/** Bỏ dấu để tìm "nghi quyet" vẫn ra "Nghị quyết". */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

// Lọc theo môn chỉ hiện khi Khoa đã mở từ hai môn trở lên.
const MULTI_SUBJECT = ACTIVE_SUBJECTS.length > 1;

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
        (!q || fold(d.title).includes(q)),
    );
    return present.map((k) => ({ kind: k, docs: shown.filter((d) => d.kind === k) })).filter((g) => g.docs.length);
  }, [docs, kinds, subjects, query, present]);

  return (
    <div className="flex flex-col gap-10">
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
              {KIND_LABELS[k]}
              <span className="text-xs opacity-60">{docs.filter((d) => d.kind === k).length}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <InputGroup className="bg-white md:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên tài liệu" aria-label="Tìm tài liệu" />
        </InputGroup>
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
          <section key={g.kind} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {KIND_LABELS[g.kind as DocKind]}
              <Badge variant="outline">{g.docs.length}</Badge>
            </h2>
            <ul className="overflow-hidden rounded-xl border bg-white">
              {g.docs.map((d) => (
                <li key={d.slug} className="border-b last:border-b-0">
                  <Link href={`/thu-vien/${d.slug}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-primary-soft sm:p-5">
                    <IconTile icon={KIND_ICONS[d.kind]} className="size-11" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[15px] font-medium leading-snug group-hover:text-primary">{d.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {MULTI_SUBJECT && `${getSubject(d.subject)?.shortName} · `}
                        {docMeta(d)}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-sm font-medium text-primary sm:flex">
                      Đọc
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
