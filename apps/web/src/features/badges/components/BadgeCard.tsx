import { Check, Circle } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { reviewHref } from "@/features/review/paths";
import { cn } from "@/lib/utils";

import { TIER_LABELS } from "../catalog";
import type { CollectedBadge } from "../server/badges";
import { BadgeMedal, Stars } from "./BadgeMedal";

const TIER_TEXT = {
  dong: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  bac: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  vang: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

const NEW_MS = 3 * 86_400_000;

/** Mở khóa trong ba ngày gần đây, hoặc vừa mở khóa ở lần xét này. */
export const isNew = (b: CollectedBadge, now: number) => b.fresh || (b.earnedAt !== null && now - b.earnedAt.getTime() < NEW_MS);

const date = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

/** Một ô trong bộ sưu tập: huy chương, tên, điều kiện, ngày đạt hoặc tiến độ còn thiếu. */
export function BadgeCard({ badge: b, now }: { badge: CollectedBadge; now: number }) {
  const fresh = b.earned && isNew(b, now);
  const met = b.chapter?.criteria.filter((c) => c.met).length ?? 0;

  const body = (
    <>
      <BadgeMedal icon={b.icon} tier={b.tier} earned={b.earned} chapter={b.chapter?.number} className={cn(b.fresh && "motion-safe:animate-medal-pop")} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("font-semibold leading-snug", !b.earned && "text-foreground/80")}>{b.name}</span>
          {b.earned && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", TIER_TEXT[b.tier])}>{TIER_LABELS[b.tier]}</span>}
          {fresh && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Mới</span>}
        </div>
        <p className="text-sm leading-snug text-muted-foreground">{b.description}</p>

        {b.chapter && (
          <div className="mt-1 flex flex-col gap-1.5">
            <Stars met={met} total={b.chapter.criteria.length} />
            <ul className="flex flex-col gap-0.5 text-xs">
              {b.chapter.criteria.map((c) => (
                <li key={c.label} className={cn("flex items-center gap-1.5", c.met ? "text-foreground/80" : "text-muted-foreground")}>
                  {c.met ? <Check className="size-3.5 text-primary" /> : <Circle className="size-3 text-muted-foreground/50" />}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {b.earned ? (
          b.earnedAt && <span className="mt-auto pt-1 text-xs text-muted-foreground">Đạt ngày {date(b.earnedAt)}</span>
        ) : (
          <div className="mt-auto flex flex-col gap-1 pt-1">
            <Progress value={Math.min(100, (b.current / b.target) * 100)} aria-label={`Tiến độ huy hiệu ${b.name}`} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.min(b.current, b.target)}/{b.target} {b.unit}
            </span>
          </div>
        )}
      </div>
    </>
  );

  const className = cn(
    "flex-row items-start gap-4 px-4 py-4 transition-shadow",
    b.earned ? "bg-card" : "bg-card/60",
    fresh && "ring-2 ring-primary/40",
  );

  // Huy chương chương học dẫn tới trang ôn tập của chương, để làm tiếp phần còn thiếu.
  if (b.chapter) {
    return (
      <Link
        href={reviewHref(b.chapter.subject, b.chapter.number)}
        className="group/badge flex rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Card size="sm" className={cn(className, "w-full group-hover/badge:ring-primary/35")}>
          {body}
        </Card>
      </Link>
    );
  }
  return (
    <Card size="sm" className={className}>
      {body}
    </Card>
  );
}
