import { ArrowRight, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Prose } from "@/components/markdown/Prose";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSubject } from "@/config/subjects";
import { PostCard } from "@/features/blog/components/PostCard";
import { getPost, getPosts } from "@/features/blog/server/posts";
import { formatDate } from "@/features/blog/types";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bai-viet/[slug]">): Promise<Metadata> {
  const post = getPost((await params).slug);
  return post ? { title: post.title, description: post.description } : {};
}

async function PostPageContent({ params }: PageProps<"/bai-viet/[slug]">) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const subject = getSubject(post.subject);
  const others = getPosts().filter((p) => p.slug !== post.slug).slice(0, 3);
  const chapters = subject?.chapters.filter((c) => post.chapters.includes(c.number)) ?? [];

  return (
    <>
      <PageHeader crumbs={[{ label: "Bài viết", href: "/bai-viet" }, { label: post.title }]} title={post.title} lead={post.description}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge>{post.category}</Badge>
          <span>{post.author}</span>
          <span>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>· {post.readingMinutes} phút đọc</span>
        </div>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_260px] lg:gap-16">
        <article className="flex min-w-0 max-w-3xl flex-col gap-8">
          {post.cover && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl border">
              <Image src={post.cover} alt="" fill priority sizes="(min-width: 1024px) 768px, 100vw" className="object-cover" />
            </div>
          )}
          <Prose>{post.body}</Prose>
        </article>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-subtle p-5 lg:sticky lg:top-24">
            {chapters.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Chương liên quan</p>
                {chapters.map((c) => (
                  <Link key={c.number} href={`/mon/${post.subject}/chuong/${c.number}`} className="text-sm font-medium leading-snug hover:text-primary">
                    <span className="font-heading text-primary">{String(c.number).padStart(2, "0")}</span> {c.title}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Còn thắc mắc về nội dung bài viết?</p>
              <Button render={<Link href={`/tro-ly?mon=${post.subject}${post.chapters.length ? `&chuong=${post.chapters.join(",")}` : ""}`} />} nativeButton={false}>
                <MessageSquareText data-icon="inline-start" />
                Hỏi trợ lý
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="border-t bg-subtle">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold">Bài viết khác</h2>
              <Button variant="link" render={<Link href="/bai-viet" />} nativeButton={false} className="px-0">
                Tất cả bài viết
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {others.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function PostPage(props: PageProps<"/bai-viet/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PostPageContent {...props} />
    </Suspense>
  );
}
