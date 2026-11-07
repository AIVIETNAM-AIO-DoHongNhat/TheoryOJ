import { Check, Flag, Newspaper, UserCheck, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import {
  AXES, AXIS_LABELS, type GradedPoint, type GradedRubric, type GradeResult, LEVEL_LABELS, type Level, type PublishedRebuttal,
  type RubricPoint, STANCE_LABELS,
} from "../types";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export const LEVEL_STYLE: Record<Level, string> = {
  dat: "bg-primary-soft text-primary",
  mot_phan: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  thieu: "bg-muted text-muted-foreground",
  sai: "bg-destructive/10 text-destructive",
};

function PointRow({ rubric, graded }: { rubric: RubricPoint; graded: GradedPoint }) {
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
      {graded.comment && <p className="text-sm leading-relaxed">{graded.comment}</p>}
      {rubric.page ? <p className="text-xs text-muted-foreground">Xem lại giáo trình tr. {rubric.page}.</p> : null}
    </li>
  );
}

/** Kết quả giảng viên chấm một bài: điểm, từng ý của barem kèm mức đạt và nhận xét, lập trường với bài phản bác. */
export function GradeReport({ rubric, result, graderName, gradedAt, published }: {
  rubric: GradedRubric;
  result: GradeResult;
  graderName?: string | null;
  gradedAt?: string;
  published?: PublishedRebuttal[];
}) {
  const byId = new Map(result.points.map((p) => [p.id, p]));
  const groups = rubric.points.some((p) => p.axis)
    ? AXES.map((axis) => ({ axis, points: rubric.points.filter((p) => p.axis === axis) })).filter((g) => g.points.length)
    : [{ axis: null, points: rubric.points }];
  const when = gradedAt
    ? new Date(gradedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" })
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Điểm giảng viên chấm</span>
          <span className="font-heading text-4xl font-bold tabular-nums text-primary">
            {fmt(result.score)}
            <span className="text-xl text-muted-foreground">/{fmt(result.maxScore)}</span>
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Progress value={result.maxScore ? (result.score / result.maxScore) * 100 : 0} />
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <UserCheck className="size-3.5 text-primary" aria-hidden />
            {graderName ? `Giảng viên ${graderName}` : "Giảng viên phụ trách"}
            {when ? ` chấm lúc ${when}` : ""}
            {result.stance && (
              <Badge variant={result.stance === "dung" ? "tint" : "destructive"}>{STANCE_LABELS[result.stance]}</Badge>
            )}
          </span>
          {result.overall && (
            <p className="whitespace-pre-line text-sm leading-relaxed">
              <span className="font-semibold">Nhận xét: </span>
              {result.overall}
            </p>
          )}
        </div>
      </div>

      {result.stance && result.stance !== "dung" && (
        <Alert variant="destructive">
          <Flag />
          <AlertTitle>{result.stance === "sai" ? "Bài chưa phản bác được luận điệu" : "Lập trường trong bài chưa vững"}</AlertTitle>
          <AlertDescription>
            Đồng chí đọc kỹ nhận xét của giảng viên, đối chiếu với giáo trình, văn kiện và bài phản bác chính thống bên dưới, rồi viết lại.
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
                return graded ? <PointRow key={p.id} rubric={p} graded={graded} /> : null;
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
    </div>
  );
}
