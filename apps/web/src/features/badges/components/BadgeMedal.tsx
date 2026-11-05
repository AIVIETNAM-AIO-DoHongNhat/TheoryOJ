import {
  Award, BookOpen, Brain, Calculator, CalendarDays, Crosshair, Flame, GalleryVerticalEnd, GraduationCap, ListChecks, LockKeyhole, type LucideIcon,
  MessageSquareText, NotebookPen, PenLine, Star, Target,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { BadgeIcon, Tier } from "../catalog";

const ICONS: Record<BadgeIcon, LucideIcon> = {
  flame: Flame,
  calendar: CalendarDays,
  list: ListChecks,
  target: Target,
  crosshair: Crosshair,
  calculator: Calculator,
  cards: GalleryVerticalEnd,
  brain: Brain,
  pen: PenLine,
  message: MessageSquareText,
  notebook: NotebookPen,
  graduation: GraduationCap,
  chapter: BookOpen,
  award: Award,
};

/** Viền kim loại và mặt huy chương theo hạng. */
const TIER_STYLE: Record<Tier, { rim: string; face: string }> = {
  dong: {
    rim: "from-orange-200 via-amber-600 to-orange-900 shadow-orange-900/25",
    face: "from-amber-500 via-orange-600 to-amber-800",
  },
  bac: {
    rim: "from-white via-slate-400 to-slate-600 shadow-slate-600/25",
    face: "from-slate-300 via-slate-400 to-slate-600",
  },
  vang: {
    rim: "from-yellow-100 via-amber-400 to-yellow-700 shadow-amber-600/30",
    face: "from-yellow-300 via-amber-400 to-amber-600",
  },
};

const SIZES = {
  sm: { box: "size-10", pad: "p-1", icon: "size-4", number: "text-sm", lock: "size-4 [&_svg]:size-2.5" },
  md: { box: "size-16", pad: "p-1.5", icon: "size-7", number: "text-2xl", lock: "size-5 [&_svg]:size-3" },
  lg: { box: "size-24", pad: "p-2", icon: "size-10", number: "text-4xl", lock: "size-7 [&_svg]:size-4" },
};

/**
 * Huy chương tròn: viền kim loại, mặt có biểu tượng (huy chương chương học in số chương).
 * Chưa đạt thì xám, viền nét đứt, có ổ khóa nhỏ ở góc.
 */
export function BadgeMedal({
  icon,
  tier,
  earned,
  chapter,
  size = "md",
  className,
}: {
  icon: BadgeIcon;
  tier: Tier;
  earned: boolean;
  chapter?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = ICONS[icon];
  const s = SIZES[size];
  const face = chapter !== undefined ? <span className={cn("font-heading leading-none font-bold tabular-nums", s.number)}>{chapter}</span> : <Icon className={s.icon} />;

  if (!earned) {
    return (
      <span className={cn("relative inline-flex shrink-0 rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted", s.pad, s.box, className)} aria-hidden>
        <span className="flex size-full items-center justify-center rounded-full bg-card text-muted-foreground/45">{face}</span>
        <span className={cn("absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border bg-background text-muted-foreground", s.lock)}>
          <LockKeyhole />
        </span>
      </span>
    );
  }

  const t = TIER_STYLE[tier];
  return (
    <span className={cn("relative inline-flex shrink-0 rounded-full bg-linear-to-br shadow-md", t.rim, s.pad, s.box, className)} aria-hidden>
      <span
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-full bg-linear-to-br text-white",
          "shadow-[inset_0_2px_4px_rgb(0_0_0/0.25),inset_0_-1px_2px_rgb(255_255_255/0.35)] [&_svg]:drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]",
          t.face,
        )}
      >
        {/* Vệt sáng nửa trên, để mặt huy chương có độ bóng. */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-linear-to-b from-white/35 to-transparent" />
        <span className="relative [text-shadow:0_1px_1px_rgb(0_0_0/0.35)]">{face}</span>
      </span>
    </span>
  );
}

/** Hàng sao của huy chương chương học: số tiêu chí đã đạt trên tổng số. */
export function Stars({ met, total, className }: { met: number; total: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${met}/${total} sao`}>
      {Array.from({ length: total }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < met ? "fill-amber-400 text-amber-500" : "text-muted-foreground/35")} />
      ))}
    </span>
  );
}
