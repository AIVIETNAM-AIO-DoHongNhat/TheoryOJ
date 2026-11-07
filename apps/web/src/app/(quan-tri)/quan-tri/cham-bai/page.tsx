import { ChevronLeft, ChevronRight, Flag, Gauge, PenLine, Sigma, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeading, dateTime } from "@/features/admin/components/AdminHeading";
import { Initials, Panel, PanelHeader, StatTile } from "@/features/admin/components/AdminUi";
import {
  GRADING_FILTER_LABELS, GRADING_FILTERS, type GradingFilter, gradingCounts, gradingOverview, listGraded,
} from "@/features/admin/server/grading";
import type { Agreement } from "@/features/open-answer/agreement";
import type { AttemptKind } from "@/features/open-answer/types";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Chấm bài · Quản trị" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (x: number | null, digits = 2) => (x === null ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: digits }));

const KIND_LABELS: Record<string, string> = { tu_luan: "Tự luận", phan_bac: "Phản bác" };
const KIND_PARAM: Record<string, AttemptKind> = { "tu-luan": "tu_luan", "phan-bac": "phan_bac" };

function AgreementLine({ label, a }: { label: string; a: Agreement }) {
  return (
    <tr className="border-t text-sm">
      <td className="px-5 py-2.5 font-medium">{label}</td>
      <td className="px-3 py-2.5 tabular-nums">{a.n}</td>
      <td className="px-3 py-2.5 tabular-nums">{num(a.spearman)}</td>
      <td className="px-3 py-2.5 tabular-nums">{num(a.pearson)}</td>
      <td className="px-3 py-2.5 tabular-nums">{num(a.mae)}</td>
      <td className="px-3 py-2.5 tabular-nums">{a.within1 === null ? "—" : `${Math.round(a.within1 * 100)} %`}</td>
      <td className="px-3 py-2.5 tabular-nums">{a.bias === null ? "—" : `${a.bias > 0 ? "+" : ""}${num(a.bias)}`}</td>
    </tr>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  await requireTeacher("/quan-tri/cham-bai");
  const params = await searchParams;
  const loc = one(params.loc);
  const filter: GradingFilter = GRADING_FILTERS.includes(loc as GradingFilter) ? (loc as GradingFilter) : "cho-cham";
  const kindParam = one(params.loai);
  const kind = kindParam ? KIND_PARAM[kindParam] ?? null : null;
  const page = Math.max(1, Number(one(params.trang)) || 1);
  const [overview, counts, { items, hasMore }] = await Promise.all([gradingOverview(), gradingCounts(), listGraded({ filter, kind, page })]);

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
        <StatTile icon={PenLine} label="Bài đã chấm tự động" value={overview.attempts.toLocaleString("vi-VN")} hint="Tự luận và phản bác của học viên" accent />
        <StatTile icon={Users} label="Học viên tham gia" value={overview.students.toLocaleString("vi-VN")} />
        <StatTile icon={Sigma} label="Điểm hệ thống trung bình" value={num(overview.avgScore, 1)} hint="Thang 10" />
        <StatTile
          icon={Gauge}
          label="Tương quan với giảng viên"
          value={num(overview.all.spearman)}
          hint={overview.all.n ? `Spearman trên ${overview.all.n} bài giảng viên đã chấm` : "Chưa có bài giảng viên chấm"}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Độ đồng thuận giữa hệ thống và giảng viên"
          description="Tính trên các bài giảng viên đã chấm lại, điểm quy về thang 10. Mục tiêu ở PLAN.md mục 9: Spearman từ 0,7, sai lệch trung bình không quá 1,5 điểm."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">Loại bài</th>
                <th className="px-3 py-2.5">Số bài</th>
                <th className="px-3 py-2.5">Spearman</th>
                <th className="px-3 py-2.5">Pearson</th>
                <th className="px-3 py-2.5">Lệch TB</th>
                <th className="px-3 py-2.5">Lệch ≤ 1 điểm</th>
                <th className="px-3 py-2.5">Hệ thống chấm cao hơn</th>
              </tr>
            </thead>
            <tbody>
              <AgreementLine label="Tự luận" a={overview.byKind.tu_luan} />
              <AgreementLine label="Phản bác" a={overview.byKind.phan_bac} />
              <AgreementLine label="Chung" a={overview.all} />
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        {GRADING_FILTERS.map((f) => (
          <Button key={f} variant={f === filter ? "default" : "outline"} size="sm" className={cn(f !== filter && "bg-card")} render={<Link href={href({ loc: f })} />} nativeButton={false}>
            {f === "gan-co" && <Flag data-icon="inline-start" />}
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
          <p className="p-8 text-center text-sm text-muted-foreground">Không có bài nào.</p>
        ) : (
          <ul>
            {items.map((it) => (
              <li key={it.id} className="border-t first:border-t-0">
                <Link href={`/quan-tri/cham-bai/${it.id}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                      <span className="rounded bg-primary-soft px-1.5 py-px font-semibold text-primary">{KIND_LABELS[it.kind]}</span>
                      Chương {it.chapter} · {it.itemId}
                      {it.flagged && <span className="inline-flex items-center gap-1 font-semibold text-destructive"><Flag className="size-3" />Gắn cờ</span>}
                      <time className="ml-auto tabular-nums">{dateTime(it.createdAt)}</time>
                    </span>
                    <span className="line-clamp-1 text-sm font-medium">{it.prompt}</span>
                    {it.student ? (
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Initials name={it.student.name} className="size-5 text-[9px]" />
                        {it.student.name} · {it.student.code} · Lớp {it.student.className}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm tabular-nums">
                    <span className="flex flex-col items-end">
                      <span className="text-[11px] text-muted-foreground">Hệ thống</span>
                      <span className="font-semibold">{num(it.score)}/{num(it.maxScore)}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="text-[11px] text-muted-foreground">Giảng viên</span>
                      <span className={cn("font-semibold", it.lecturerScore === null ? "text-muted-foreground" : "text-primary")}>
                        {it.lecturerScore === null ? "chưa chấm" : `${num(it.lecturerScore)}/${num(it.maxScore)}`}
                      </span>
                    </span>
                  </div>
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
        overline="Kiểm định"
        title="Chấm bài tự luận và phản bác"
        description="Bài học viên nộp được hệ thống chấm theo barem. Giảng viên chấm lại một phần để kiểm định chất lượng chấm tự động; bài gắn cờ (lập trường chưa vững, chèn lệnh) cần xem trước."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
