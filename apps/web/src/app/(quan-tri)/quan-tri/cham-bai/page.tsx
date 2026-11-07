import { CheckCheck, ChevronLeft, ChevronRight, Clock, Flag, Hourglass, Sigma } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubject } from "@/config/subjects";
import { AdminHeading, dateTime } from "@/features/admin/components/AdminHeading";
import { Initials, Panel, StatTile } from "@/features/admin/components/AdminUi";
import {
  GRADING_FILTER_LABELS, GRADING_FILTERS, type GradingFilter, gradingCounts, gradingOverview, listGraded,
} from "@/features/admin/server/grading";
import { type AttemptKind, KIND_LABELS } from "@/features/open-answer/types";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Chấm bài · Quản trị" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (x: number | null, digits = 2) => (x === null ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: digits }));

const KIND_PARAM: Record<string, AttemptKind> = { "tu-luan": "tu_luan", "phan-bac": "phan_bac" };

/** Thời gian chờ dễ đọc: dưới một ngày tính giờ, từ một ngày tính ngày. */
function waitLabel(hours: number | null) {
  if (hours === null) return "—";
  return hours < 24 ? `${num(hours, 1)} giờ` : `${num(hours / 24, 1)} ngày`;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireTeacher();
  const params = await searchParams;
  const loc = one(params.loc);
  const filter: GradingFilter = GRADING_FILTERS.includes(loc as GradingFilter) ? (loc as GradingFilter) : "cho-cham";
  const kindParam = one(params.loai);
  const kind = kindParam ? KIND_PARAM[kindParam] ?? null : null;
  const page = Math.max(1, Number(one(params.trang)) || 1);

  if (user.subjects.length === 0) {
    return (
      <Panel className="p-8 text-center text-sm text-muted-foreground">
        Tài khoản của đồng chí chưa được phân công môn phụ trách nên chưa có bài để chấm. Người quản trị gán môn bằng lệnh
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">npm run cap-quyen -- &lt;mã&gt; --mon ktct</code>.
      </Panel>
    );
  }

  const [overview, counts, { items, hasMore }] = await Promise.all([
    gradingOverview(user.subjects),
    gradingCounts(user.subjects),
    listGraded({ filter, kind, page, subjects: user.subjects }),
  ]);

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    if (!("trang" in patch)) next.delete("trang");
    return `/quan-tri/cham-bai?${next}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Hourglass} label="Bài chờ chấm" value={overview.pending.toLocaleString("vi-VN")} hint="Bài nộp trước được xếp trước" accent />
        <StatTile icon={CheckCheck} label="Đã chấm trong 7 ngày" value={overview.gradedWeek.toLocaleString("vi-VN")} />
        <StatTile icon={Clock} label="Thời gian chờ trung bình" value={waitLabel(overview.avgWaitHours)} hint="Từ lúc nộp tới lúc được chấm, 30 ngày qua" />
        <StatTile icon={Sigma} label="Điểm trung bình" value={num(overview.avgScore, 1)} hint={`Thang 10 · ${overview.students} học viên đã nộp bài`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {GRADING_FILTERS.map((f) => (
          <Button key={f} variant={f === filter ? "default" : "outline"} size="sm" className={cn(f !== filter && "bg-card")} render={<Link href={href({ loc: f })} />} nativeButton={false}>
            {f === "can-trao-doi" && <Flag data-icon="inline-start" />}
            {GRADING_FILTER_LABELS[f]}
            <span className="tabular-nums opacity-70">{counts[f]}</span>
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {[null, "tu-luan", "phan-bac"].map((k) => (
          <Button key={k ?? "all"} variant={kindParam === k || (!kindParam && !k) ? "secondary" : "ghost"} size="sm" render={<Link href={href({ loai: k })} />} nativeButton={false}>
            {k ? KIND_LABELS[KIND_PARAM[k]] : "Mọi loại"}
          </Button>
        ))}
      </div>

      <Panel>
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {filter === "cho-cham" ? "Không còn bài nào chờ chấm." : "Không có bài nào."}
          </p>
        ) : (
          <ul>
            {items.map((it) => (
              <li key={it.id} className="border-t first:border-t-0">
                <Link href={`/quan-tri/cham-bai/${it.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                      <span className="rounded bg-primary-soft px-1.5 py-px font-semibold text-primary">{KIND_LABELS[it.kind]}</span>
                      {getSubject(it.subject)?.shortName ?? it.subject} · chương {it.chapter} · {it.itemId}
                      {it.flagged && <span className="inline-flex items-center gap-1 font-semibold text-destructive"><Flag className="size-3" />Cần trao đổi</span>}
                      <time className="ml-auto tabular-nums">Nộp {dateTime(it.submittedAt)}</time>
                    </span>
                    <span className="line-clamp-1 text-sm font-medium">{it.prompt}</span>
                    {it.student && (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Initials name={it.student.name} className="size-5 text-[9px]" />
                        {it.student.name} · {it.student.code} · Lớp {it.student.className}
                      </span>
                    )}
                  </div>
                  <span className={cn("shrink-0 text-sm font-semibold tabular-nums", it.score === null ? "text-amber-700 dark:text-amber-300" : "text-primary")}>
                    {it.score === null ? "Chờ chấm" : `${num(it.score)}/${num(it.maxScore)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" className="bg-card" disabled={page === 1} render={<Link href={href({ trang: String(page - 1) })} />} nativeButton={false}>
            <ChevronLeft data-icon="inline-start" />
            Trang trước
          </Button>
          <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">Trang {page}</span>
          <Button variant="outline" size="sm" className="bg-card" disabled={!hasMore} render={<Link href={href({ trang: String(page + 1) })} />} nativeButton={false}>
            Trang sau
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function GradingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <AdminHeading
        overline="Chấm bài"
        title="Bài tự luận và phản bác"
        description="Bài học viên nộp ở môn đồng chí phụ trách. Chấm từng ý theo barem do Khoa duyệt và ghi nhận xét; học viên thấy kết quả ngay khi lưu."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
