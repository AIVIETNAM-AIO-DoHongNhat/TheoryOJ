import { cn } from "@/lib/utils";

import type { Video } from "../types";

/**
 * Khung phát video nhúng. Facebook, YouTube phát trong iframe của họ (CSP frame-src ở next.config.ts phải cho phép nguồn đó).
 * Video ngang giữ tỉ lệ 16:9 theo bề rộng cột; video dọc (reel) 9:16, hẹp lại và căn giữa.
 */
export function VideoPlayer({ video, className }: { video: Video; className?: string }) {
  const vertical = video.orientation === "doc";
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-black", vertical ? "mx-auto aspect-9/16 w-full max-w-sm" : "aspect-video w-full", className)}>
      <iframe
        src={video.embed.src}
        title={video.title}
        className="size-full border-0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
