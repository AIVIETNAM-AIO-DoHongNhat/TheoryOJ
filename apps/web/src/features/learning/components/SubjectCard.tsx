import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { Subject } from "@/config/subjects";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Thẻ chọn môn, dùng ở trang chọn môn của Bài học (/mon) và Ôn tập (/on-tap).
 * Số thứ tự, trạng thái, tên, mô tả, số liệu và một lối vào ở chân thẻ; cả thẻ bấm được.
 * Môn chưa mở giữ cùng khung nhưng chữ nhạt, không có lối vào, để người xem thấy lộ trình của Khoa.
 */
export function SubjectCard({
  subject,
  index,
  href,
  cta,
  stats,
}: {
  subject: Subject;
  index: number;
  href: string;
  cta: string;
  stats: { label: string; value: number }[];
}) {
  const { active } = subject;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border bg-card transition duration-300",
        active && "hover:border-primary/40 hover:shadow-card",
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-7">
        <div className="flex items-center justify-between text-xs">
          <span className="font-heading font-bold tabular-nums text-muted-foreground/70">{pad(index)}</span>
          <span className={cn("flex items-center gap-1.5 font-medium", active ? "text-primary" : "text-muted-foreground")}>
            <span aria-hidden className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/40")} />
            {active ? "Đang mở" : "Sắp triển khai"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", active ? "text-primary" : "text-muted-foreground/80")}>
            {subject.shortName}
          </span>
          <h2 className={cn("text-balance text-[22px] font-bold leading-snug", !active && "text-foreground/50")}>
            {active ? (
              // Lớp phủ after: cả thẻ bấm được.
              <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
                {subject.name}
              </Link>
            ) : (
              subject.name
            )}
          </h2>
          <p className={cn("text-sm leading-relaxed", active ? "text-muted-foreground" : "text-muted-foreground/70")}>{subject.description}</p>
        </div>

        {active && stats.length > 0 && (
          <dl className="mt-auto flex items-baseline gap-5 pt-2">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="font-heading text-[26px] font-bold leading-tight tabular-nums">{s.value.toLocaleString("vi-VN")}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="flex items-center justify-between border-t px-7 py-4 text-sm">
        {active ? (
          <>
            <span className="font-semibold text-primary">{cta}</span>
            <ArrowRight className="size-4 text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </>
        ) : (
          <span className="text-muted-foreground/80">Khoa đang biên soạn</span>
        )}
      </div>
    </article>
  );
}
