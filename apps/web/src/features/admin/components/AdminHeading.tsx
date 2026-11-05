import { PASS_RATIO } from "@/features/quiz/types";

/** Tiêu đề trang trong khu quản trị: nhãn nhóm, tên trang, một dòng mô tả, nút bên phải. */
export function AdminHeading({ overline, title, description, actions }: {
  overline?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {overline && (
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-px w-5 bg-current" aria-hidden />
            {overline}
          </span>
        )}
        <h1 className="font-heading text-[28px] font-bold leading-tight tracking-tight text-balance sm:text-[32px]">{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);
export const score10 = (x: number | null) => (x === null ? "—" : (Math.round(x * 100) / 10).toLocaleString("vi-VN"));
export const dateTime = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : "—";

/** "5 phút trước", "3 ngày trước"; quá 30 ngày thì in ngày. Chỉ gọi sau khi trang đã đọc dữ liệu động. */
export function timeAgo(d: Date | string | null, now = new Date()) {
  if (!d) return "—";
  const date = new Date(d);
  const min = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const day = Math.round(h / 24);
  if (day < 30) return `${day} ngày trước`;
  return date.toLocaleDateString("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Mức của một tỷ lệ (điểm hoặc tỷ lệ đạt): tốt từ ngưỡng đạt, trung bình từ 0,4. */
export type Tone = "good" | "mid" | "low" | "none";
export const toneOf = (x: number | null | undefined): Tone =>
  x === null || x === undefined ? "none" : x >= PASS_RATIO ? "good" : x >= 0.4 ? "mid" : "low";

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-primary",
  mid: "text-warn",
  low: "text-destructive",
  none: "text-muted-foreground",
};
export const TONE_BG: Record<Tone, string> = {
  good: "bg-primary",
  mid: "bg-warn",
  low: "bg-destructive",
  none: "bg-muted-foreground/30",
};
