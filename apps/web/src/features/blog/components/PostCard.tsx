import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { formatDate, type Post } from "../types";
import { PostCover } from "./PostCover";

/** Thẻ bài viết. Bài không có ảnh bìa dùng bìa chữ (PostCover), không để khung trống. */
export function PostCard({ post, featured }: { post: Post; featured?: boolean }) {
  return (
    <Link
      href={`/bai-viet/${post.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-colors hover:border-primary/40",
        featured && "md:grid md:grid-cols-2",
      )}
    >
      <div className={cn("relative aspect-[16/9] overflow-hidden border-b", featured && "md:aspect-auto md:min-h-72 md:border-b-0 md:border-r")}>
        {post.cover ? (
          <Image src={post.cover} alt="" fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        ) : (
          <PostCover post={post} featured={featured} className="absolute inset-0" />
        )}
      </div>
      <div className={cn("flex flex-1 flex-col gap-3 p-5 sm:p-6", featured && "md:justify-center md:p-8")}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{post.category}</Badge>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>· {post.readingMinutes} phút đọc</span>
        </div>
        <h3 className={cn("text-balance font-bold leading-snug group-hover:text-primary", featured ? "text-2xl sm:text-3xl" : "text-lg")}>
          {post.title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
          Đọc bài
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
