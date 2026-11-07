import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getSubject } from "@/config/subjects";
import { formatDate } from "@/features/blog/types";
import { cn } from "@/lib/utils";

import type { Video } from "../types";
import { VideoCover } from "./VideoCover";

/** Thẻ video ở danh sách. Không nhúng trình phát ở đây: mỗi khung Facebook tải nặng, chỉ mở ở trang xem. */
export function VideoCard({ video, featured }: { video: Video; featured?: boolean }) {
  const subject = getSubject(video.subject);
  return (
    <Link
      href={`/thu-vien/video/${video.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40",
        featured && "md:grid md:grid-cols-2",
      )}
    >
      <div className={cn("relative aspect-[16/9] overflow-hidden border-b", featured && "md:aspect-auto md:min-h-72 md:border-b-0 md:border-r")}>
        <VideoCover video={video} featured={featured} className="absolute inset-0" />
      </div>
      <div className={cn("flex flex-1 flex-col gap-3 p-5 sm:p-6", featured && "md:justify-center md:p-8")}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {subject && <Badge variant="outline">{subject.shortName}</Badge>}
          <time dateTime={video.date}>{formatDate(video.date)}</time>
          {video.author && <span>· {video.author}</span>}
        </div>
        <h3 className={cn("text-balance font-bold leading-snug group-hover:text-primary", featured ? "text-2xl sm:text-3xl" : "text-lg")}>
          {video.title}
        </h3>
        {video.description && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{video.description}</p>}
        <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
          Xem video
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
