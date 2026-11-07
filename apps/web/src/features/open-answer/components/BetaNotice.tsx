import { FlaskConical, Gauge, ListChecks, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";

/** Nhãn ngắn của Đấu trường phản bác trong giai đoạn thử nghiệm: đầu trang, thẻ ở trang chủ. */
export const BETA_LABEL = "Thử nghiệm";

/**
 * Nhãn nhỏ "Thử nghiệm" đặt cạnh tên Đấu trường, cùng bảng màu xanh của trang.
 * Nền sáng: xanh nhạt; nền tối (đầu trang có lớp `dark`, hoặc `tone="dark"` trên khối xanh đậm): chữ bạc hà, viền trắng mờ.
 */
export function BetaBadge({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ring-1",
        tone === "dark"
          ? "bg-white/10 text-mint ring-white/20"
          : "bg-primary-soft text-primary ring-primary/15 dark:bg-white/10 dark:text-mint dark:ring-white/20",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      {BETA_LABEL}
    </span>
  );
}

const NOTICE_ITEMS = [
  { icon: ListChecks, title: "Bộ luận điệu", text: "Giảng viên rà soát và bổ sung theo từng đợt." },
  { icon: Gauge, title: "Chấm bài", text: "Giảng viên phụ trách môn chấm và nhận xét; điểm để rèn luyện, chưa tính vào kết quả học tập." },
];

/**
 * Lời giới thiệu bản thử nghiệm ở đầu trang Đấu trường: thẻ nền xanh nhạt, hai ô trắng nêu hai điều người dùng cần biết
 * (bộ luận điệu còn bổ sung, giảng viên chấm và điểm chưa tính chính thức), dòng cuối chỉ nơi gửi góp ý.
 */
export function BetaNotice({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-5 rounded-2xl bg-primary-soft/70 p-5 ring-1 ring-primary/15 sm:p-6 dark:bg-primary-soft",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm ring-1 ring-primary/10">
          <FlaskConical className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
            Đấu trường đang trong giai đoạn thử nghiệm
            <BetaBadge />
          </p>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            Đấu trường phản bác là tính năng mới. Khoa đưa tính năng này vào thử nghiệm và tiếp tục hoàn thiện.
          </p>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {NOTICE_ITEMS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-primary/10">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-pretty text-[13px] leading-relaxed text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MessageSquare className="size-3.5 shrink-0 text-primary" aria-hidden />
        Góp ý về Đấu trường, đồng chí gửi qua giảng viên phụ trách.
      </p>
    </aside>
  );
}
