import { getSubject } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { coverCode, type DocKind, docYear, FORMAT_LABELS, type LibraryDoc } from "../types";

/** Màu theo loại tài liệu, lấy từ token --kind-* ở globals.css. Viết đủ tên lớp để Tailwind sinh được. */
export const KIND_COLORS: Record<DocKind, { bg: string; text: string; soft: string }> = {
  giao_trinh: { bg: "bg-kind-giao-trinh", text: "text-kind-giao-trinh", soft: "bg-kind-giao-trinh/10 dark:bg-kind-giao-trinh/25" },
  van_kien: { bg: "bg-kind-van-kien", text: "text-kind-van-kien", soft: "bg-kind-van-kien/8 dark:bg-kind-van-kien/25" },
  tham_khao: { bg: "bg-kind-tham-khao", text: "text-kind-tham-khao", soft: "bg-kind-tham-khao/10 dark:bg-kind-tham-khao/25" },
  cand: { bg: "bg-kind-cand", text: "text-kind-cand", soft: "bg-kind-cand/8 dark:bg-kind-cand/25" },
  so_lieu: { bg: "bg-kind-so-lieu", text: "text-kind-so-lieu", soft: "bg-kind-so-lieu/10 dark:bg-kind-so-lieu/25" },
};

const COVER_LABELS: Record<DocKind, string> = {
  giao_trinh: "Giáo trình",
  van_kien: "Văn kiện",
  tham_khao: "Tham khảo",
  cand: "CAND",
  so_lieu: "Số liệu",
};

/** Góc gấp ở trên phải, tính theo bề rộng bìa. */
const FOLD = "18cqw";

/**
 * Minh họa tài liệu dạng tờ văn bản: giấy sáng gấp góc, loại tài liệu và số hiệu in màu theo loại,
 * vài dòng kẻ gợi nội dung, năm ở chân. Giữ nguyên màu giấy ở cả nền sáng lẫn tối.
 * Cỡ chữ tính theo bề rộng (đơn vị cqw), nên chỉ cần đặt bề rộng qua className. Bìa hẹp dưới 72px chỉ hiện số hiệu.
 */
export function DocCover({
  doc,
  className,
}: {
  doc: Pick<LibraryDoc, "title" | "code" | "kind" | "format" | "subject">;
  className?: string;
}) {
  const code = coverCode(doc, getSubject(doc.subject)?.shortName);
  const size = code.length <= 4 ? "text-[26cqw]" : code.length <= 9 ? "text-[16cqw]" : "text-[13cqw]";
  const color = KIND_COLORS[doc.kind];

  return (
    <div aria-hidden className={cn("@container shrink-0", className)}>
      {/* Bóng đổ đặt ở lớp ngoài vì clip-path cắt mất box-shadow của chính tờ giấy. */}
      <div className="[filter:drop-shadow(0_0_0.5px_rgb(0_0_0/0.22))_drop-shadow(0_6px_10px_rgb(0_0_0/0.10))]">
        <div
          className="relative flex aspect-[3/4] flex-col rounded-[4cqw] bg-paper p-[11cqw]"
          style={{ clipPath: `polygon(0 0, calc(100% - ${FOLD}) 0, 100% ${FOLD}, 100% 100%, 0 100%)` }}
        >
          {/* Mép gấp: tam giác giấy lật xuống, sẫm hơn mặt giấy. */}
          <span
            className="absolute top-0 right-0 bg-linear-to-bl from-black/[0.02] to-black/[0.13]"
            style={{ width: FOLD, height: FOLD, clipPath: "polygon(0 0, 0 100%, 100% 100%)", borderBottomLeftRadius: "3cqw" }}
          />
          {/* Dải màu loại tài liệu ở mép trái, như gáy kẹp hồ sơ. */}
          <span className={cn("absolute inset-y-0 left-0 w-[3cqw] opacity-90", color.bg)} />

          <span className={cn("hidden text-[7.5cqw] font-semibold uppercase leading-none tracking-[0.18em] @min-[72px]:block", color.text)}>
            {COVER_LABELS[doc.kind]}
          </span>
          <span className={cn("mt-[5cqw] hidden h-[1.4cqw] w-[14cqw] rounded-full @min-[72px]:block", color.bg)} />

          <span className={cn("my-auto font-heading font-bold leading-[1.05] text-balance break-words", size, color.text)}>{code}</span>

          {/* Dòng kẻ gợi nội dung văn bản. */}
          <span className="hidden flex-col gap-[3.5cqw] @min-[72px]:flex">
            <span className="h-[1.4cqw] w-full rounded-full bg-black/[0.08]" />
            <span className="h-[1.4cqw] w-[82%] rounded-full bg-black/[0.08]" />
            <span className="h-[1.4cqw] w-[56%] rounded-full bg-black/[0.08]" />
          </span>
          <span className="mt-[6cqw] hidden text-[7.5cqw] font-medium leading-none tabular-nums text-black/45 @min-[72px]:block">
            {docYear(doc) ?? FORMAT_LABELS[doc.format]}
          </span>
        </div>
      </div>
    </div>
  );
}
