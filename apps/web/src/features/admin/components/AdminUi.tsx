import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { TONE_BG, toneOf } from "./AdminHeading";

/** Khối nội dung của trang quản trị: nền thẻ, viền mảnh, bóng rất nhẹ. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-[0_1px_2px_rgb(10_26_16/0.04)]", className)}>
      {children}
    </section>
  );
}

/** Đầu khối: tiêu đề, mô tả ngắn, vùng nút hoặc số liệu bên phải. */
export function PanelHeader({ title, description, actions, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="font-heading text-base font-semibold leading-snug">{title}</h2>
        {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Ô số liệu: nhãn, con số lớn, một dòng giải thích. */
export function StatTile({ icon: Icon, label, value, hint, accent }: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Ô nổi bật: nền xanh rừng, chữ trắng. */
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5",
        accent ? "mesh-dark border-transparent text-white" : "bg-card shadow-[0_1px_2px_rgb(10_26_16/0.04)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-[13px] font-medium", accent ? "text-white/70" : "text-muted-foreground")}>{label}</span>
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-white/10 text-mint" : "bg-primary-soft text-primary ring-1 ring-primary/10",
          )}
        >
          <Icon className="size-4" strokeWidth={1.9} aria-hidden />
        </span>
      </div>
      <span className="font-heading text-4xl font-bold leading-none tracking-tight tabular-nums">{value}</span>
      {hint && <span className={cn("text-xs", accent ? "text-white/60" : "text-muted-foreground")}>{hint}</span>}
    </div>
  );
}

/** Thanh tỷ lệ có màu theo mức (xanh từ ngưỡng đạt, vàng, đỏ) và số phần trăm bên phải. */
export function RateBar({ value, label, className }: { value: number | null; label: string; className?: string }) {
  if (value === null) return <span className="text-muted-foreground/60">—</span>;
  const tone = toneOf(value);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", TONE_BG[tone])} style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-medium tabular-nums">{Math.round(value * 100)}%</span>
    </div>
  );
}

/** Ô số chương: hai chữ số, nền xanh nhạt. */
export function ChapterNo({ n }: { n: number }) {
  return (
    <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft px-1 font-mono text-[11px] font-semibold text-primary ring-1 ring-primary/15">
      {String(n).padStart(2, "0")}
    </span>
  );
}

/** Ảnh đại diện bằng chữ cái đầu của tên (lấy tên gọi, tức từ cuối trong họ tên tiếng Việt). */
export function Initials({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const text = ((parts.length > 1 ? parts[parts.length - 2][0] : "") + (parts.at(-1)?.[0] ?? "?")).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-tint to-primary-soft text-xs font-semibold text-primary ring-1 ring-primary/15",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Kiểu tiêu đề cột dùng chung cho các bảng quản trị. */
export const TH = "h-10 bg-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

/** Ô trống trong bảng. */
export const Dash = () => <span className="text-muted-foreground/60">—</span>;
