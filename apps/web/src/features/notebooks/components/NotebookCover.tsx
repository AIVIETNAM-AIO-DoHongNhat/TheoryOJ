import {
  BookOpen, CalendarDays, ChartColumn, Flag, Globe, Lightbulb, type LucideIcon, NotebookPen, PenLine, Scale, Shield, Star, Target,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { NOTEBOOK_COLORS, type NotebookColor, type NotebookIconId } from "../types";

export const ICONS: Record<NotebookIconId, LucideIcon> = {
  so: NotebookPen,
  sach: BookOpen,
  but: PenLine,
  "bong-den": Lightbulb,
  co: Flag,
  can: Scale,
  "bieu-do": ChartColumn,
  "dia-cau": Globe,
  khien: Shield,
  "ngoi-sao": Star,
  lich: CalendarDays,
  "muc-tieu": Target,
};

/**
 * Bìa sổ: nền màu đã chọn, gáy sổ đậm hơn bên trái, biểu tượng ở giữa. Không có chữ để dùng được ở cỡ nhỏ;
 * tên sổ đặt bên cạnh. `size` "lg" cho thẻ sổ ở trang danh sách.
 */
export function NotebookCover({
  color,
  icon,
  size = "md",
  className,
}: {
  color: NotebookColor;
  icon: NotebookIconId;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden text-white shadow-sm",
        size === "sm" && "h-7 w-6 rounded-[4px] [&_svg]:size-3.5",
        size === "md" && "h-12 w-10 rounded-md [&_svg]:size-5",
        size === "lg" && "h-full w-full rounded-lg [&_svg]:size-10",
        className,
      )}
      style={{ backgroundColor: NOTEBOOK_COLORS[color].cover }}
    >
      {/* Gáy sổ và vệt sáng nhẹ để bìa trông có độ dày. */}
      <span className="absolute inset-y-0 left-0 w-[14%] bg-black/20" />
      <span className="absolute inset-y-0 left-[14%] w-px bg-white/25" />
      <span className="absolute inset-0 bg-linear-to-br from-white/15 via-transparent to-black/10" />
      <Icon className="relative ml-[8%] drop-shadow-sm" />
    </span>
  );
}
