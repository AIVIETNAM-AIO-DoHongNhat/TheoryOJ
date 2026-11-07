"use client";

import { BookOpen, Check, CircleAlert, ExternalLink, Flag, Newspaper, X } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { locator } from "@/features/chat/citation";
import { CitationChip } from "@/features/chat/components/CitationChip";
import type { Citation } from "@/features/chat/types";
import { readerHref } from "@/features/library/types";
import { cn } from "@/lib/utils";

import { AXES, AXIS_LABELS, type GradedPoint, type GradeResponse, LEVEL_LABELS, type Level, type RubricPoint } from "../types";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

const LEVEL_STYLE: Record<Level, string> = {
  dat: "bg-primary-soft text-primary",
  mot_phan: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  thieu: "bg-muted text-muted-foreground",
  sai: "bg-destructive/10 text-destructive",
};

const STANCE_LABEL = { dung: "Lập trường đúng", dao_dong: "Lập trường chưa vững", sai: "Chưa phản bác" } as const;

function openSource(prefix: string, n: number) {
  document.getElementById(`${prefix}-nguon-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function PointRow({ rubric, graded, citations, prefix }: { rubric: RubricPoint; graded: GradedPoint; citations: Citation[]; prefix: string }) {
  return (
    <li className="flex flex-col gap-2 border-t p-4 first:border-t-0">
      <div className="flex flex-wrap items-start gap-2">
        <span className={cn("inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs font-semibold", LEVEL_STYLE[graded.level])}>
          {LEVEL_LABELS[graded.level]}
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{rubric.y}</p>
        <span className="shrink-0 font-heading text-sm font-bold tabular-nums text-primary">
          {fmt(graded.score)}/{fmt(rubric.diem)}
        </span>
      </div>
      {graded.quote && (
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
          Trong bài: “{graded.quote}”
        </blockquote>
      )}
      {(graded.comment || graded.sources.length > 0) && (
        <p className="text-sm leading-relaxed">
          {graded.comment}
          {graded.sources.map((n) => (
            <CitationChip key={n} citation={citations[n - 1]} onOpen={(k) => openSource(prefix, k)} />
          ))}
        </p>
      )}
      {graded.quoteRejected && (
        <p className="text-xs text-muted-foreground">Hệ thống không tìm thấy câu tương ứng trong bài làm nên chưa tính ý này.</p>
      )}
      {!graded.sources.length && rubric.page && (
        <p className="text-xs text-muted-foreground">Xem giáo trình tr. {rubric.page}.</p>
      )}
    </li>
  );
}

/** Kết quả chấm một bài: điểm, từng ý của barem kèm câu trích từ bài làm, căn cứ trong tài liệu. */
export function GradeReport({ response, compact = false }: { response: GradeResponse; compact?: boolean }) {
  const { result, rubric, citations, published, lecturerScore, lecturerNote } = response;
  const prefix = `bai-${response.attemptId}`;
  const byId = new Map(result.points.map((p) => [p.id, p]));
  const groups = rubric.points.some((p) => p.axis)
    ? AXES.map((axis) => ({ axis, points: rubric.points.filter((p) => p.axis === axis) })).filter((g) => g.points.length)
    : [{ axis: null, points: rubric.points }];
  const shown = lecturerScore ?? result.score;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {lecturerScore != null ? "Điểm giảng viên chấm" : compact ? "Điểm câu hỏi vặn" : "Điểm dự kiến"}
          </span>
          <span className="font-heading text-4xl font-bold tabular-nums text-primary">
            {fmt(shown)}
            <span className="text-xl text-muted-foreground">/{fmt(result.maxScore)}</span>
          </span>
          {lecturerScore != null && <span className="text-xs text-muted-foreground">Hệ thống chấm: {fmt(result.score)}</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Progress value={result.maxScore ? (shown / result.maxScore) * 100 : 0} />
          {result.stance && (
            <Badge variant={result.stance === "dung" ? "tint" : "destructive"} className="self-start">
              {STANCE_LABEL[result.stance]}
            </Badge>
          )}
          {result.overall && result.stance !== "sai" && <p className="text-sm leading-relaxed">{result.overall}</p>}
          {lecturerNote && <p className="text-sm leading-relaxed"><span className="font-semibold">Giảng viên nhận xét:</span> {lecturerNote}</p>}
        </div>
      </div>

      {result.flagged && (
        <Alert variant="destructive">
          <Flag />
          <AlertTitle>Bài làm được chuyển giảng viên xem</AlertTitle>
          <AlertDescription>
            {result.stance === "sai" || result.flagReason === "chen_lenh"
              ? result.overall
              : "Bài làm có chỗ chưa thể hiện rõ lập trường phản bác. Đồng chí đọc lại nhận xét từng ý và các căn cứ bên dưới."}
          </AlertDescription>
        </Alert>
      )}

      {groups.map((g) => {
        const sum = g.points.reduce((s, p) => s + (byId.get(p.id)?.score ?? 0), 0);
        const max = g.points.reduce((s, p) => s + p.diem, 0);
        return (
          <section key={g.axis ?? "all"} className="overflow-hidden rounded-xl border bg-card">
            <header className="flex items-center justify-between gap-2 border-b bg-subtle px-4 py-2.5">
              <h3 className="text-sm font-bold">{g.axis ? AXIS_LABELS[g.axis] : "Chấm theo barem"}</h3>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">{fmt(sum)}/{fmt(max)} điểm</span>
            </header>
            <ol>
              {g.points.map((p) => {
                const graded = byId.get(p.id);
                return graded ? <PointRow key={p.id} rubric={p} graded={graded} citations={citations} prefix={prefix} /> : null;
              })}
            </ol>
          </section>
        );
      })}

      {rubric.fallacies?.length ? (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-bold">Lỗi lập luận của luận điệu</h3>
          <ul className="flex flex-col gap-2">
            {rubric.fallacies.map((f, i) => {
              const found = result.fallaciesFound?.[i];
              return (
                <li key={f} className="flex items-start gap-2 text-sm">
                  {found ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  <span className={found ? "" : "text-muted-foreground"}>
                    {f}
                    {!found && <span className="ml-1 text-xs">(bài làm chưa chỉ ra)</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {citations.length > 0 && !compact && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <BookOpen className="size-4 text-primary" />
            Căn cứ trong tài liệu
          </h3>
          <ol className="flex flex-col gap-2">
            {citations.map((c) => (
              <li key={c.n} id={`${prefix}-nguon-${c.n}`} className="scroll-mt-24 rounded-lg border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex size-5 items-center justify-center rounded bg-secondary text-[11px] font-semibold text-primary">{c.n}</span>
                  <span className="font-medium">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{locator(c)}</span>
                  <Link href={readerHref(c.document, c.pdfPage)} className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Mở trong thư viện
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{c.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {published?.length ? (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Newspaper className="size-4 text-primary" />
            Bài phản bác đã đăng trên báo chí chính thống
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {published.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{p.ten}</a>
                <span className="text-muted-foreground"> — {p.bao}{p.ngay ? `, ${p.ngay}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!compact && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          Điểm do hệ thống chấm theo barem để đồng chí tự luyện, không thay cho điểm của giảng viên. Mỗi ý chỉ được tính khi
          hệ thống tìm thấy câu tương ứng trong bài làm.
        </p>
      )}
    </div>
  );
}
