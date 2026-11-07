import { ArrowRight, ArrowUpRight, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSubject } from "@/config/subjects";
import { formatDate } from "@/features/blog/types";
import { VideoCard } from "@/features/video/components/VideoCard";
import { VideoPlayer } from "@/features/video/components/VideoPlayer";
import { PROVIDER_LABELS } from "@/features/video/embed";
import { getVideo, getVideos } from "@/features/video/server/videos";

export function generateStaticParams() {
  const slugs = getVideos().map((v) => ({ slug: v.slug }));
  // Cache Components không cho trả mảng rỗng; khi chưa có video, dựng sẵn một đường dẫn giữ chỗ (trả 404).
  return slugs.length ? slugs : [{ slug: "chua-co-video" }];
}

export async function generateMetadata({ params }: PageProps<"/thu-vien/video/[slug]">): Promise<Metadata> {
  const video = getVideo((await params).slug);
  return video ? { title: video.title, description: video.description || undefined } : {};
}

async function VideoPageContent({ params }: PageProps<"/thu-vien/video/[slug]">) {
  const video = getVideo((await params).slug);
  if (!video) notFound();
  const subject = getSubject(video.subject);
  const chapters = subject?.chapters.filter((c) => video.chapters.includes(c.number)) ?? [];
  // Video cùng môn lên trước, rồi các video khác.
  const others = getVideos()
    .filter((v) => v.slug !== video.slug)
    .sort((a, b) => Number(b.subject === video.subject) - Number(a.subject === video.subject))
    .slice(0, 3);

  return (
    <>
      <PageHeader crumbs={[{ label: "Thư viện", href: "/thu-vien" }, { label: "Video", href: "/thu-vien/video" }, { label: video.title }]} title={video.title} lead={video.description || undefined}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge>{video.category}</Badge>
          {video.author && <span>{video.author}</span>}
          {video.author && <span>·</span>}
          <time dateTime={video.date}>{formatDate(video.date)}</time>
          {video.duration && <span>· {video.duration}</span>}
        </div>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_260px] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-3">
          <VideoPlayer video={video} />
          <p className="text-xs text-muted-foreground">
            Video không phát được?{" "}
            <a href={video.embed.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              Xem trực tiếp trên {PROVIDER_LABELS[video.embed.provider]}
            </a>
            .
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-subtle p-5 lg:sticky lg:top-24">
            {chapters.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Chương liên quan</p>
                {chapters.map((c) => (
                  <Link key={c.number} href={`/mon/${video.subject}/chuong/${c.number}`} className="text-sm font-medium leading-snug hover:text-primary">
                    <span className="font-heading text-primary">{String(c.number).padStart(2, "0")}</span> {c.title}
                  </Link>
                ))}
              </div>
            )}
            {subject?.active && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Còn thắc mắc về nội dung video?</p>
                <Button
                  render={<Link href={`/tro-ly?mon=${video.subject}${video.chapters.length ? `&chuong=${video.chapters.join(",")}` : ""}`} />}
                  nativeButton={false}
                >
                  <MessageSquareText data-icon="inline-start" />
                  Hỏi trợ lý
                </Button>
              </div>
            )}
            <Button variant="outline" className="bg-card" render={<a href={video.embed.href} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
              Mở trên {PROVIDER_LABELS[video.embed.provider]}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="border-t bg-subtle">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold">Video khác</h2>
              <Button variant="link" render={<Link href="/thu-vien/video" />} nativeButton={false} className="px-0">
                Tất cả video
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {others.map((v) => (
                <VideoCard key={v.slug} video={v} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function VideoPage(props: PageProps<"/thu-vien/video/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VideoPageContent {...props} />
    </Suspense>
  );
}
