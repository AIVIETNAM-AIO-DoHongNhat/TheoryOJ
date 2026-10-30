import { BookOpenCheck, Compass, FileText, type LucideIcon, Newspaper, ScrollText } from "lucide-react";

import { getSubject } from "@/config/subjects";
import { cn } from "@/lib/utils";

import type { Post } from "../types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Hướng dẫn": Compass,
  "Ôn tập": BookOpenCheck,
  "Văn kiện": ScrollText,
  "Tin tức": Newspaper,
};

/**
 * Bìa chữ của bài viết: nền xanh đậm có lưới mảnh, nhãn loại bài, tên môn và số chương lớn dạng chữ viền.
 * Bài không gắn chương thì dùng biểu tượng của loại bài làm hình nền.
 */
export function PostCover({ post, featured, className }: { post: Post; featured?: boolean; className?: string }) {
  const Icon = CATEGORY_ICONS[post.category] ?? FileText;
  const subject = getSubject(post.subject);
  const chapter = post.chapters[0];

  return (
    <div className={cn("relative isolate overflow-hidden mesh-dark text-white", className)}>
      {/* Lưới mảnh mờ dần về phía dưới, ánh sáng nhẹ khi rê chuột. */}
      <div className="absolute inset-0 -z-10 grid-lines [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute -right-16 -bottom-24 -z-10 size-72 rounded-full bg-mint/10 blur-3xl transition-colors duration-500 group-hover:bg-mint/20" />

      {chapter ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-10 right-4 -z-10 select-none font-heading font-black leading-none tracking-tighter text-transparent transition-transform duration-500 [-webkit-text-stroke:1.5px_rgb(187_247_208/0.35)] group-hover:-translate-y-1",
            featured ? "text-[9rem] md:top-14 md:right-8 md:text-[13rem]" : "text-[7.5rem]",
          )}
        >
          {String(chapter).padStart(2, "0")}
        </span>
      ) : (
        <Icon
          aria-hidden
          strokeWidth={0.75}
          className={cn(
            "pointer-events-none absolute top-8 -right-8 -z-10 text-mint/20 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-4deg]",
            featured ? "size-44 md:top-12 md:-right-14 md:size-64" : "size-36",
          )}
        />
      )}

      <div className={cn("flex h-full flex-col justify-between gap-6 p-5 sm:p-6", featured && "md:p-8")}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full glass-dark px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
            <Icon className="size-3.5" strokeWidth={2} />
            {post.category}
          </span>
          {subject && <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">{subject.shortName}</span>}
        </div>
        <div className={cn("flex flex-col gap-1", featured ? "max-w-[70%]" : "max-w-[62%]")}>
          {chapter && <span className="text-xs font-medium uppercase tracking-[0.16em] text-mint">Chương {post.chapters.join(", ")}</span>}
          <span className={cn("text-balance font-heading font-bold leading-tight text-white", featured ? "text-2xl md:text-3xl" : "text-xl")}>
            {subject?.name ?? "Khoa Lý luận chính trị"}
          </span>
        </div>
      </div>
    </div>
  );
}
