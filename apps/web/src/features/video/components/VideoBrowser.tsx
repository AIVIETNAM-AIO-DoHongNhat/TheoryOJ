"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getSubject, SUBJECTS } from "@/config/subjects";

import type { Video } from "../types";
import { VideoCard } from "./VideoCard";

/** Bỏ dấu để tìm "nghi quyet" vẫn ra "Nghị quyết". */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

/** Thứ tự nút loại; loại khác do người nhập tự đặt xếp sau, theo bảng chữ cái. */
const CATEGORY_ORDER = ["Bài giảng", "Minh họa", "Tư liệu", "Hướng dẫn"];

function categoriesOf(videos: Video[]): string[] {
  const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
  return [...new Set(videos.map((v) => v.category))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "vi"));
}

/**
 * Tab Video của Thư viện, kèm bộ lọc: tìm theo tên, lọc theo loại và theo môn (chọn nhiều được).
 * Chỉ hiện nút của loại và môn đang có video. Chưa lọc thì video mới nhất được làm nổi bật.
 */
export function VideoBrowser({ videos }: { videos: Video[] }) {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const filtered = query.trim() !== "" || categories.length > 0 || subjects.length > 0;

  const presentCategories = useMemo(() => categoriesOf(videos), [videos]);
  // Giữ thứ tự môn như ở subjects.ts; môn chưa mở vẫn lọc được nếu đã có video.
  const presentSubjects = useMemo(() => SUBJECTS.filter((s) => videos.some((v) => v.subject === s.id)), [videos]);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return videos.filter(
      (v) =>
        (!categories.length || categories.includes(v.category)) &&
        (!subjects.length || subjects.includes(v.subject)) &&
        (!q || fold(`${v.title} ${v.description} ${v.author ?? ""} ${getSubject(v.subject)?.name ?? ""}`).includes(q)),
    );
  }, [videos, categories, subjects, query]);

  const reset = () => {
    setQuery("");
    setCategories([]);
    setSubjects([]);
  };

  const [first, ...rest] = shown;

  return (
    <div className="flex flex-col gap-8">
      {/* Thanh lọc nổi lên mép dưới hero Thư viện như tab Tài liệu; màn rộng thì dính theo khi cuộn. */}
      <div className="relative z-20 -mt-12 flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-float sm:-mt-14 md:sticky md:top-19">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <InputGroup className="h-11 rounded-xl bg-background lg:max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, nội dung, kênh đăng" aria-label="Tìm học liệu" />
            {query && (
              <InputGroupAddon align="inline-end">
                <button type="button" onClick={() => setQuery("")} aria-label="Xóa ô tìm" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
          <ToggleGroup multiple value={categories} onValueChange={setCategories} variant="chip" spacing={1.5} aria-label="Lọc theo loại" className="flex-1 flex-wrap">
            {presentCategories.map((c) => (
              <ToggleGroupItem key={c} value={c} className="h-9 rounded-full px-3.5">
                {c}
                <span className="text-xs tabular-nums opacity-60">{videos.filter((v) => v.category === c).length}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={reset} className="self-start text-muted-foreground lg:self-auto">
              <X data-icon="inline-start" />
              Bỏ lọc ({shown.length})
            </Button>
          )}
        </div>
        <ToggleGroup multiple value={subjects} onValueChange={setSubjects} variant="chip" spacing={1.5} aria-label="Lọc theo môn" className="w-full flex-wrap border-t pt-3">
          {presentSubjects.map((s) => (
            <ToggleGroupItem key={s.id} value={s.id} className="rounded-full px-3.5">
              {s.name}
              <span className="text-xs tabular-nums opacity-60">{videos.filter((v) => v.subject === s.id).length}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {!first ? (
        <Empty className="rounded-3xl border border-dashed py-20">
          <EmptyHeader>
            <EmptyTitle>Không có học liệu phù hợp</EmptyTitle>
            <EmptyDescription>Thử bỏ bộ lọc hoặc tìm bằng từ khác.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={reset}>Bỏ lọc</Button>
        </Empty>
      ) : filtered ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((v) => (
            <VideoCard key={v.slug} video={v} />
          ))}
        </div>
      ) : (
        <>
          <VideoCard video={first} featured />
          {rest.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((v) => (
                <VideoCard key={v.slug} video={v} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
