"use client";

import { Check, CheckCheck, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { gradeSubmission } from "@/features/open-answer/admin-actions";
import { LEVEL_STYLE } from "@/features/open-answer/components/GradeReport";
import { buildResult, GradeInputError, pointScore } from "@/features/open-answer/grading";
import {
  AXES, AXIS_LABELS, type AttemptKind, type GradedRubric, type GradeResult, LEVEL_LABELS, type Level, LEVELS,
  MAX_COMMENT, MAX_OVERALL, type RubricPoint, type Stance, STANCE_LABELS, STANCES,
} from "@/features/open-answer/types";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/**
 * Form chấm của giảng viên: chọn mức đạt từng ý theo barem (kèm nhận xét nếu cần), với bài phản bác thêm lập trường
 * và lỗi lập luận đã chỉ ra. Tổng điểm tính ngay bằng cùng hàm máy chủ dùng khi lưu (grading.ts).
 */
export function LecturerGradingForm({ id, kind, rubric, initial }: {
  id: number;
  kind: AttemptKind;
  rubric: GradedRubric;
  /** Kết quả đã chấm, để chấm lại. */
  initial: GradeResult | null;
}) {
  const router = useRouter();
  const [levels, setLevels] = useState<Record<string, Level>>(
    Object.fromEntries((initial?.points ?? []).map((p) => [p.id, p.level])),
  );
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries((initial?.points ?? []).filter((p) => p.comment).map((p) => [p.id, p.comment])),
  );
  const [openComment, setOpenComment] = useState<Record<string, boolean>>({});
  const [overall, setOverall] = useState(initial?.overall ?? "");
  const [stance, setStance] = useState<Stance | undefined>(initial?.stance);
  const [fallacies, setFallacies] = useState<boolean[]>(initial?.fallaciesFound ?? (rubric.fallacies ?? []).map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const rebuttal = kind === "phan_bac";
  const missing = rubric.points.filter((p) => !levels[p.id]).length;
  const partial = rubric.points.reduce((s, p) => s + (levels[p.id] ? pointScore(levels[p.id], p.diem) : 0), 0);
  const max = rubric.points.reduce((s, p) => s + p.diem, 0);
  let total = partial;
  try {
    if (!missing) total = buildResult(kind, rubric, { levels, stance: stance ?? "dung", fallaciesFound: fallacies }).result.score;
  } catch (e) {
    if (!(e instanceof GradeInputError)) throw e;
  }
  if (rebuttal && stance === "sai") total = 0;

  const groups = rubric.points.some((p) => p.axis)
    ? AXES.map((axis) => ({ axis, points: rubric.points.filter((p) => p.axis === axis) })).filter((g) => g.points.length)
    : [{ axis: null, points: rubric.points }];

  const touch = () => setSaved(false);

  const save = () =>
    start(async () => {
      setError(null);
      const r = await gradeSubmission({ id, levels, comments, overall, stance, fallaciesFound: fallacies });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });

  // Hàm dựng (không phải component) để ô nhận xét không bị dựng lại, mất con trỏ mỗi lần gõ.
  const pointGrader = (p: RubricPoint) => (
    <li key={p.id} className="flex flex-col gap-2.5 border-t p-4 first:border-t-0">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {p.y}
          {p.page ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">GT tr. {p.page}</span> : null}
        </p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
          {levels[p.id] ? fmt(pointScore(levels[p.id], p.diem)) : "–"}/{fmt(p.diem)}
        </span>
      </div>
      <div role="radiogroup" aria-label={`Mức đạt: ${p.y}`} className="flex flex-wrap gap-1.5">
        {LEVELS.map((l) => {
          const active = levels[p.id] === l;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { setLevels((s) => ({ ...s, [p.id]: l })); touch(); }}
              className={cn(
                "h-8 rounded-lg border px-3 text-xs font-semibold transition-colors",
                active ? cn(LEVEL_STYLE[l], "border-transparent ring-2 ring-current/25") : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {LEVEL_LABELS[l]}
            </button>
          );
        })}
        {!openComment[p.id] && !comments[p.id] && (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpenComment((s) => ({ ...s, [p.id]: true }))}>
            <MessageSquarePlus data-icon="inline-start" />
            Nhận xét ý này
          </Button>
        )}
      </div>
      {(openComment[p.id] || comments[p.id]) && (
        <Textarea
          value={comments[p.id] ?? ""}
          onChange={(e) => { setComments((s) => ({ ...s, [p.id]: e.target.value })); touch(); }}
          maxLength={MAX_COMMENT}
          rows={2}
          placeholder="Nhận xét cho học viên về ý này"
          className="bg-card text-sm"
        />
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-heading text-3xl font-bold tabular-nums text-primary">
          {fmt(total)}<span className="text-lg text-muted-foreground">/{fmt(max)}</span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setLevels(Object.fromEntries(rubric.points.map((p) => [p.id, "dat" as Level]))); touch(); }}
        >
          <CheckCheck data-icon="inline-start" />
          Đạt mọi ý
        </Button>
      </div>
      {missing > 0 && <p className="-mt-3 text-xs text-muted-foreground">Còn {missing} ý chưa chọn mức đạt.</p>}

      {groups.map((g) => (
        <section key={g.axis ?? "all"} className="overflow-hidden rounded-xl border">
          <header className="border-b bg-subtle px-4 py-2 text-sm font-bold">{g.axis ? AXIS_LABELS[g.axis] : "Barem"}</header>
          <ol>
            {g.points.map(pointGrader)}
          </ol>
        </section>
      ))}

      {rebuttal && (
        <section className="flex flex-col gap-3 rounded-xl border p-4">
          <h3 className="text-sm font-bold">Lập trường của bài</h3>
          <div role="radiogroup" aria-label="Lập trường" className="flex flex-col gap-1.5">
            {STANCES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stance === s}
                onClick={() => { setStance(s); touch(); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  stance === s
                    ? s === "dung" ? "border-primary bg-primary-soft text-primary" : "border-destructive/40 bg-destructive/10 text-destructive"
                    : "hover:bg-muted",
                )}
              >
                <span className={cn("size-3.5 rounded-full border-2", stance === s ? "border-current bg-current" : "border-muted-foreground/40")} />
                {STANCE_LABELS[s]}
                {s === "sai" && <span className="ml-auto text-xs opacity-75">0 điểm</span>}
              </button>
            ))}
          </div>
          {rubric.fallacies?.length ? (
            <>
              <h3 className="mt-2 text-sm font-bold">Lỗi lập luận bài làm đã chỉ ra</h3>
              <ul className="flex flex-col gap-2">
                {rubric.fallacies.map((f, i) => (
                  <li key={f}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <Checkbox
                        checked={fallacies[i] ?? false}
                        onCheckedChange={(v) => { setFallacies((s) => s.map((x, k) => (k === i ? Boolean(v) : x))); touch(); }}
                        className="mt-0.5"
                      />
                      {f}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nhận xét chung cho học viên
        <Textarea
          value={overall}
          onChange={(e) => { setOverall(e.target.value); touch(); }}
          maxLength={MAX_OVERALL}
          rows={4}
          placeholder="Điểm mạnh của bài, việc cần bổ sung, gợi ý tài liệu nên đọc lại"
          className="bg-card font-normal"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending || missing > 0 || (rebuttal && !stance)}>
          {pending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
          {initial ? "Lưu kết quả chấm lại" : "Lưu kết quả chấm"}
        </Button>
        {saved && <span className="text-sm text-primary">Đã lưu, học viên đã thấy kết quả.</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
