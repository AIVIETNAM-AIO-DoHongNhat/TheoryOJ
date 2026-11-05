import { TriangleAlert } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Subject } from "@/config/subjects";
import { PASS_RATIO } from "@/features/quiz/types";
import { cn } from "@/lib/utils";

import type { ChapterStat } from "../server/stats";
import { score10, TONE_TEXT, toneOf } from "./AdminHeading";
import { ChapterNo, Dash, RateBar, TH } from "./AdminUi";

/** Chương có tỷ lệ đạt thấp nhất trong số chương đã có người làm (cần từ hai chương trở lên). */
export function weakestChapter(stats: ChapterStat[]) {
  const attempted = stats.filter((s) => s.people > 0 && s.passRate !== null);
  return attempted.length > 1 ? attempted.reduce((a, b) => (b.passRate! < a.passRate! ? b : a)) : null;
}

/** Bảng điểm theo chương: điểm lượt đầu, lượt cao nhất, tỷ lệ đạt, thẻ đã thuộc. Chương có tỷ lệ đạt thấp nhất được đánh dấu. */
export function ChapterTable({ subject, stats, cardTotals }: { subject: Subject; stats: ChapterStat[]; cardTotals: Record<number, number> }) {
  const weakest = weakestChapter(stats);
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(TH, "pl-5")}>Chương</TableHead>
          <TableHead className={cn(TH, "text-right")}>Người làm</TableHead>
          <TableHead className={cn(TH, "text-right")}>Lượt đầu</TableHead>
          <TableHead className={cn(TH, "text-right")}>Cao nhất</TableHead>
          <TableHead className={cn(TH, "w-44 pl-6")}>Tỷ lệ đạt (≥ {score10(PASS_RATIO)})</TableHead>
          <TableHead className={cn(TH, "pr-5 text-right")}>Thẻ thuộc / người</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subject.chapters.map((c) => {
          const s = stats.find((x) => x.chapter === c.number);
          const weak = weakest?.chapter === c.number;
          return (
            <TableRow key={c.number} className={cn(weak && "bg-destructive/[0.035] hover:bg-destructive/[0.06]")}>
              <TableCell className="min-w-64 max-w-80 py-3 pl-5 whitespace-normal">
                <div className="flex items-start gap-3">
                  <ChapterNo n={c.number} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="leading-snug">{c.title}</span>
                    {weak && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                        <TriangleAlert className="size-3" />
                        Tỷ lệ đạt thấp nhất, nên ôn lại trên lớp
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{s?.people || <Dash />}</TableCell>
              <TableCell className={cn("text-right font-medium tabular-nums", TONE_TEXT[toneOf(s?.firstAvg)])}>
                {s?.firstAvg == null ? <Dash /> : score10(s.firstAvg)}
              </TableCell>
              <TableCell className={cn("text-right font-medium tabular-nums", TONE_TEXT[toneOf(s?.bestAvg)])}>
                {s?.bestAvg == null ? <Dash /> : score10(s.bestAvg)}
              </TableCell>
              <TableCell className="pl-6">
                <RateBar value={s?.passRate ?? null} label={`Tỷ lệ đạt chương ${c.number}`} />
              </TableCell>
              <TableCell className="pr-5 text-right tabular-nums">
                {s?.masteredAvg == null ? (
                  <Dash />
                ) : (
                  <>
                    <span className="font-medium">{(Math.round(s.masteredAvg * 10) / 10).toLocaleString("vi-VN")}</span>
                    <span className="text-muted-foreground">/{cardTotals[c.number] ?? 0}</span>
                  </>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Ba con số tóm tắt một môn, đặt ở đầu khối bảng chương. */
export function ChapterSummary({ stats, chapterCount }: { stats: ChapterStat[]; chapterCount: number }) {
  const attempted = stats.filter((s) => s.people > 0);
  const rated = attempted.filter((s) => s.passRate !== null);
  const avgPass = rated.length ? rated.reduce((n, s) => n + s.passRate!, 0) / rated.length : null;
  const people = attempted.reduce((n, s) => Math.max(n, s.people), 0);
  const items = [
    { label: "Chương đã có người làm", value: `${attempted.length}/${chapterCount}` },
    { label: "Người làm nhiều nhất", value: people || "—" },
    { label: "Tỷ lệ đạt trung bình", value: avgPass === null ? "—" : `${Math.round(avgPass * 100)}%`, tone: toneOf(avgPass) },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x border-b">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5 px-5 py-3">
          <dt className="text-[11px] text-muted-foreground">{it.label}</dt>
          <dd className={cn("font-heading text-lg font-semibold tabular-nums", it.tone && TONE_TEXT[it.tone])}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
