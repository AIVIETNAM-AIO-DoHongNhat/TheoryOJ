import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Subject } from "@/config/subjects";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Vạch chữ mờ thay cho nội dung trên tờ giấy của môn chưa mở. */
function Lines({ widths }: { widths: string[] }) {
  return (
    <span aria-hidden className="flex flex-col gap-1.5 pt-1">
      {widths.map((w, i) => (
        <span key={i} className="h-1.5 rounded-full bg-forest/10" style={{ width: w }} />
      ))}
    </span>
  );
}

/**
 * Một tờ giấy trong túi: màu giấy ngà (--paper, giữ nguyên ở giao diện tối như giấy thật), bóng đổ, chữ nhỏ.
 * Vị trí và độ nghiêng do lớp truyền vào.
 */
function Sheet({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute top-0 flex h-44 w-[52%] flex-col gap-1.5 rounded-xl bg-paper p-3.5 text-[#3d4a42] shadow-[0_10px_24px_-8px_rgb(0_0_0/0.45)]",
        "transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        className,
      )}
    >
      <span className="text-[10px] font-semibold tracking-[0.14em] text-[#15803d] uppercase">{label}</span>
      {children}
    </div>
  );
}

/**
 * Thẻ chọn môn kiểu túi hồ sơ, dùng ở trang chọn môn của Bài học (/mon) và Ôn tập (/on-tap).
 * Môn đang mở dùng nền xanh rừng như hero trang chủ (mesh-dark): trong túi có hai tờ giấy nhô lên (mô tả môn, các chương),
 * mặt túi kính mờ mang số liệu và nút vào màu mint. Rê chuột thì thẻ nhấc lên, giấy xòe ra. Cả thẻ bấm được.
 * Môn chưa mở bị khóa: nền sáng, ổ khóa thay số thứ tự, giấy trống nhét sâu trong túi, ổ khóa trong mặt túi,
 * không có lối vào và không phản hồi rê chuột; vẫn hiện để người xem thấy lộ trình của Khoa.
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
  const chapters = subject.chapters.slice(0, 5);

  return (
    <article
      aria-disabled={!active || undefined}
      className={cn(
        "group relative isolate flex h-full flex-col overflow-hidden rounded-3xl p-5 transition duration-300",
        active
          ? "mesh-dark text-white shadow-card ring-1 ring-white/10 hover:-translate-y-1 hover:shadow-float"
          : "cursor-not-allowed bg-linear-to-b from-primary-soft to-card shadow-card ring-1 ring-primary/15 select-none",
      )}
    >
      {/* Lưới mảnh như hero: trắng trên nền tối của môn đang mở, xanh rất nhạt trên nền sáng của môn đã khóa. */}
      <span aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", active ? "grid-lines" : "grid-lines-light")} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className={cn("text-balance text-lg leading-snug font-bold", active ? "text-white" : "text-foreground/75")}>
            {active ? (
              // Lớp phủ after: cả thẻ bấm được.
              <Link href={href} className="after:absolute after:inset-0 after:z-30 after:rounded-3xl">
                {subject.name}
              </Link>
            ) : (
              subject.name
            )}
          </h2>
          <span className="flex items-center gap-2 text-xs">
            <span className={cn("font-semibold tracking-wide", active ? "text-mint" : "text-primary/75")}>{subject.shortName}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                active ? "bg-white/10 text-white/85" : "bg-primary/8 text-primary/80",
              )}
            >
              <span aria-hidden className={cn("size-1.5 rounded-full", active ? "bg-mint shadow-[0_0_6px] shadow-mint" : "bg-primary/45")} />
              {active ? "Đang mở" : "Chưa mở"}
            </span>
          </span>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl font-heading text-base font-bold tabular-nums",
            active ? "bg-white/10 text-mint ring-1 ring-white/15" : "bg-card text-primary/70 shadow-sm ring-1 ring-primary/15",
          )}
        >
          {active ? pad(index) : <Lock className="size-4" aria-label="Đã khóa" />}
        </span>
      </div>

      {/* Túi hồ sơ: giấy nằm sau, mặt túi phủ lên nửa dưới. Môn chưa mở: giấy nhét sâu, túi khóa lại. */}
      <div className="relative mt-6 h-64 flex-none">
        {/* Tờ sau lệch phải, chỉ mép trái nằm dưới tờ trước: chữ thụt vào để không bị che. */}
        <Sheet
          label="Các chương"
          className={cn(
            "right-[2%] rotate-[5deg] pl-5",
            active ? "translate-y-4 group-hover:translate-x-2 group-hover:translate-y-0 group-hover:rotate-[8deg]" : "translate-y-7 opacity-90",
          )}
        >
          {active && chapters.length ? (
            <ol className="flex flex-col gap-1 text-[11px] leading-snug">
              {chapters.map((c) => (
                <li key={c.number} className="line-clamp-1">
                  <span className="font-semibold text-[#15803d]">{c.number}.</span> {c.title}
                </li>
              ))}
            </ol>
          ) : (
            <Lines widths={["90%", "75%", "85%", "60%", "80%"]} />
          )}
        </Sheet>
        <Sheet
          label="Giới thiệu môn"
          className={cn(
            "left-[2%] rotate-[-4deg]",
            active ? "translate-y-1 group-hover:-translate-x-2 group-hover:-translate-y-3 group-hover:rotate-[-7deg]" : "translate-y-5 opacity-90",
          )}
        >
          {active ? (
            <p className="line-clamp-6 text-[11px] leading-relaxed">{subject.description}</p>
          ) : (
            <Lines widths={["95%", "80%", "88%", "70%"]} />
          )}
        </Sheet>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex h-34 flex-col justify-between rounded-2xl p-4 backdrop-blur-md",
            active
              ? "bg-forest/45 shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_-10px_30px_-12px_rgb(0_0_0/0.5)] ring-1 ring-white/15"
              : "flex-row items-center justify-start gap-3.5 bg-card/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_-8px_24px_-12px_rgb(10_26_16/0.2)] ring-1 ring-primary/15",
          )}
        >
          {active ? (
            <>
              {/* Số liệu chia đều cột, ngăn bằng vạch mảnh; nút trải hết bề ngang bên dưới. */}
              {stats.length > 0 && (
                <dl className="grid grid-flow-col auto-cols-fr divide-x divide-white/12">
                  {stats.map((s, i) => (
                    <div key={s.label} className={cn("flex flex-col-reverse gap-0.5", i > 0 && "pl-4")}>
                      <dt className="truncate text-xs text-white/60">{s.label}</dt>
                      <dd className="font-heading text-2xl leading-none font-bold text-white tabular-nums">{s.value.toLocaleString("vi-VN")}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <span className="flex h-10 items-center justify-between rounded-xl bg-mint px-4 text-sm font-semibold text-forest transition-colors group-hover:bg-white">
                {cta}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </span>
            </>
          ) : (
            <>
              {/* Ổ khóa nằm trong mặt túi, cùng hàng với chữ như số liệu của môn đang mở. */}
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/15">
                <Lock className="size-5" strokeWidth={1.75} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground/80">Chưa mở môn này</span>
                <span className="text-xs leading-relaxed text-muted-foreground">Khoa đang biên soạn giáo trình, tài liệu và câu hỏi.</span>
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
