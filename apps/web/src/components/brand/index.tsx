import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Nhãn phụ chữ in hoa, giãn chữ, ví dụ tiêu đề cột hay nhóm. */
export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}

/** Tiêu đề phần: nhãn có gạch ngắn phía trước, tiêu đề chữ có chân, đoạn dẫn. */
export function SectionHeading({
  overline,
  title,
  lead,
  dark,
  align = "left",
  className,
}: {
  overline?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  dark?: boolean;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" ? "mx-auto max-w-2xl items-center text-center" : "max-w-2xl items-start", className)}>
      {overline && (
        <span className={cn("flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em]", dark ? "text-mint" : "text-primary")}>
          <span className="h-px w-8 bg-current" aria-hidden />
          {overline}
        </span>
      )}
      <h2 className={cn("text-balance text-3xl font-bold leading-tight sm:text-4xl", dark && "text-white")}>{title}</h2>
      {lead && <p className={cn("text-pretty text-base leading-relaxed sm:text-[17px]", dark ? "text-white/70" : "text-muted-foreground")}>{lead}</p>}
    </div>
  );
}

/**
 * Ô biểu tượng: nền trắng, viền mảnh, nét icon mảnh màu chủ đạo.
 * Nằm trong Toggle đang chọn thì đổi sang nền xanh, icon trắng.
 */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-white text-primary transition-colors",
        "group-aria-pressed/toggle:border-primary group-aria-pressed/toggle:bg-primary group-aria-pressed/toggle:text-primary-foreground",
        className,
      )}
    >
      <Icon className="size-[48%]" aria-hidden strokeWidth={1.75} />
    </span>
  );
}

/**
 * Logo Học viện An ninh nhân dân, lấy từ hvannd.edu.vn (110 × 110 px).
 * Cần đơn vị có thẩm quyền cho phép trước khi công khai (PLAN.md mục 5).
 */
export function AcademyLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo-hvannd.png"
      alt="Logo Học viện An ninh nhân dân"
      width={110}
      height={110}
      priority={priority}
      className={cn("size-10 shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)]", className)}
    />
  );
}
