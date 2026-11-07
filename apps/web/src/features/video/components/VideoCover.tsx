import { Play } from "lucide-react";
import Image from "next/image";

import { getSubject } from "@/config/subjects";
import { cn } from "@/lib/utils";

import type { Video } from "../types";

/**
 * Bìa của video: ảnh `cover` khai trong danh sách, không có thì ảnh thu nhỏ của nền tảng (YouTube).
 * Facebook không cho lấy ảnh thu nhỏ, nên video Facebook không khai `cover` dùng bìa chữ
 * cùng kiểu với bìa bài viết (PostCover): nền xanh đậm, tên môn, chương, nút phát bên phải.
 */
export function VideoCover({ video, featured, className }: { video: Video; featured?: boolean; className?: string }) {
  const subject = getSubject(video.subject);
  const chapter = video.chapters[0];
  const image = video.cover ?? video.embed.thumbnail;

  return (
    <div className={cn("relative isolate overflow-hidden mesh-dark text-white", className)}>
      {image ? (
        <>
          {/* Ảnh thu nhỏ ở máy chủ nền tảng nên không qua bộ tối ưu ảnh của Next.js (CSP img-src đã mở i.ytimg.com). */}
          <Image
            src={image}
            alt=""
            fill
            unoptimized={!image.startsWith("/")}
            sizes="(min-width: 768px) 560px, 100vw"
            className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/65 via-black/5 to-black/25" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-10 grid-lines mask-[linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="absolute -right-16 -bottom-24 -z-10 size-72 rounded-full bg-mint/10 blur-3xl transition-colors duration-500 group-hover:bg-mint/20" />
        </>
      )}

      <div className={cn("flex h-full flex-col justify-between gap-6 p-5 sm:p-6", featured && "md:p-8")}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full glass-dark px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
            {video.category}
          </span>
          {video.duration && <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs font-medium tabular-nums">{video.duration}</span>}
        </div>
        {!image && (
          <div className={cn("flex flex-col gap-1", featured ? "max-w-[70%]" : "max-w-[62%]")}>
            {chapter && <span className="text-xs font-medium uppercase tracking-[0.16em] text-mint">Chương {video.chapters.join(", ")}</span>}
            <span className={cn("text-balance font-heading font-bold leading-tight", featured ? "text-2xl md:text-3xl" : "text-xl")}>
              {subject?.name ?? "Khoa LLCT&KHXHNV"}
            </span>
          </div>
        )}
      </div>

      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition-transform duration-300 group-hover:scale-110",
          !image && "left-auto right-6 translate-x-0",
          featured ? "size-16 md:size-20" : "size-14",
        )}
      >
        <Play className={cn("ml-1 fill-current", featured ? "size-7 md:size-8" : "size-6")} />
      </span>
    </div>
  );
}
