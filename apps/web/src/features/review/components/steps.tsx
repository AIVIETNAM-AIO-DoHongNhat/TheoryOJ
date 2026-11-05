import { Calculator, GalleryVerticalEnd, ListChecks, type LucideIcon } from "lucide-react";

import { MODE_ICONS } from "@/features/chat/mode-icons";
import { PASS_RATIO, QUIZ_SIZE } from "@/features/quiz/types";
import { cn } from "@/lib/utils";

/** Bốn bước ôn một chương. Hướng dẫn ở /on-tap và hàng bước của mỗi chương ở /on-tap/[mon] đi đúng thứ tự, số và biểu tượng này. */
export const STEPS: { icon: LucideIcon; name: string; tool: string; text: string }[] = [
  {
    icon: GalleryVerticalEnd,
    name: "Ghi nhớ",
    tool: "Thẻ ghi nhớ",
    text: "Thuộc khái niệm và công thức. Thẻ chưa nhớ chắc quay lại sớm hơn theo lịch lặp lại ngắt quãng.",
  },
  {
    icon: ListChecks,
    name: "Kiểm tra",
    tool: "Trắc nghiệm",
    text: `Đề ${QUIZ_SIZE} câu ngẫu nhiên, có giải thích và trang giáo trình. Đạt khi đúng từ ${Math.round(PASS_RATIO * QUIZ_SIZE)}/${QUIZ_SIZE} câu.`,
  },
  {
    icon: Calculator,
    name: "Vận dụng",
    tool: "Bài tập tính toán",
    text: "Chỉ ở chương có công thức. Số liệu đổi mỗi lần làm, chấm ngay, có lời giải từng bước.",
  },
  {
    icon: MODE_ICONS.review,
    name: "Ôn thi",
    tool: "Ôn với trợ lý",
    text: "Trợ lý đặt câu hỏi tự luận theo chương và nhận xét dàn ý trả lời của đồng chí.",
  },
];

/** Số bước trong vòng tròn. Dùng chung cho hướng dẫn và hàng bước của chương để hai nơi khớp nhau. */
export function StepBadge({ n, muted }: { n: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold tabular-nums",
        muted ? "border border-dashed text-muted-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {n}
    </span>
  );
}

export type Step = (typeof STEPS)[number];

/** Bảng hướng dẫn các bước, đánh số theo thứ tự. Dùng cho cách ôn (Ôn tập) và cách học (Bài học). */
export function StepGuide({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.name} className="flex flex-col gap-2 bg-card p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={i + 1} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{s.name}</span>
            <s.icon className="ml-auto size-4 text-primary/60" strokeWidth={1.75} aria-hidden />
          </div>
          <h3 className="text-[15px] font-bold">{s.tool}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Bảng bốn bước ôn một chương, xếp cùng lưới với hàng bước của mỗi chương ở /on-tap/[mon]. */
export function ReviewMethod() {
  return <StepGuide steps={STEPS} />;
}
