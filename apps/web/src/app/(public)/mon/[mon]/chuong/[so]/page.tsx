import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, GraduationCap, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IconTile } from "@/components/brand";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { getSubject, SUBJECTS } from "@/config/subjects";
import { PostCard } from "@/features/blog/components/PostCard";
import { getPosts } from "@/features/blog/server/posts";
import { MODE_ICONS } from "@/features/chat/mode-icons";
import { MODES } from "@/features/chat/modes";
import { chapterQuestions } from "@/features/learning/content";
import { KIND_ICONS } from "@/features/library/components/DocIcon";
import { docsForChapter } from "@/features/library/server/catalog";
import { KIND_LABELS, printedPage, readerHref } from "@/features/library/types";

export function generateStaticParams() {
  return SUBJECTS.filter((s) => s.active).flatMap((s) => s.chapters.map((c) => ({ mon: s.id, so: String(c.number) })));
}

async function load(params: PageProps<"/mon/[mon]/chuong/[so]">["params"]) {
  const { mon, so } = await params;
  const subject = getSubject(mon);
  const chapter = subject?.chapters.find((c) => c.number === Number(so));
  return subject?.active && chapter ? { subject, chapter } : null;
}

export async function generateMetadata({ params }: PageProps<"/mon/[mon]/chuong/[so]">): Promise<Metadata> {
  const data = await load(params);
  return data ? { title: `Chương ${data.chapter.number}: ${data.chapter.title}` } : {};
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>;
}

async function ChapterPageContent({ params }: PageProps<"/mon/[mon]/chuong/[so]">) {
  const data = await load(params);
  if (!data) notFound();
  const { subject, chapter } = data;
  const n = chapter.number;

  const docs = docsForChapter(subject.id, n);
  const textbook = docs.find((d) => d.kind === "giao_trinh");
  const range = textbook?.chapters.find((c) => c.number === n);
  const related = docs.filter((d) => d !== textbook);
  const posts = getPosts().filter((p) => p.subject === subject.id && p.chapters.includes(n));
  const questions = chapterQuestions[subject.id]?.[n] ?? [];
  const prev = subject.chapters.find((c) => c.number === n - 1);
  const next = subject.chapters.find((c) => c.number === n + 1);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Học liệu", href: "/mon" }, { label: subject.shortName, href: `/mon/${subject.id}` }, { label: `Chương ${n}` }]}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">Chương {n}</span>
            {chapter.title}
          </>
        }
        lead={
          textbook && range
            ? `${subject.name} · Giáo trình, trang ${printedPage(textbook, range.from)}–${printedPage(textbook, range.to)}`
            : subject.name
        }
        actions={
          <>
            {textbook && range && (
              <Button render={<Link href={readerHref(textbook.file, range.from)} />} nativeButton={false}>
                <BookOpen data-icon="inline-start" />
                Đọc trong giáo trình
              </Button>
            )}
            <Button variant="outline" render={<Link href={`/tro-ly?mon=${subject.id}&che-do=review&chuong=${n}`} />} nativeButton={false} className="bg-white">
              <GraduationCap data-icon="inline-start" />
              Ôn thi chương
            </Button>
          </>
        }
      />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <section className="flex flex-col gap-4">
          <SectionTitle>Câu hỏi gợi ý</SectionTitle>
          <ul className="flex flex-col gap-3">
            {questions.map((q) => (
              <li key={q.text}>
                <Link
                  href={`/tro-ly?mon=${subject.id}&che-do=${q.mode}&chuong=${n}&q=${encodeURIComponent(q.text)}`}
                  className="group flex items-center gap-4 rounded-xl border bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <IconTile icon={MODE_ICONS[q.mode]} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium leading-snug">{q.text}</span>
                    <span className="text-xs text-muted-foreground">{MODES[q.mode].label}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
          <Button variant="link" render={<Link href={`/tro-ly?mon=${subject.id}&chuong=${n}`} />} nativeButton={false} className="self-start px-0">
            <MessageSquareText data-icon="inline-start" />
            Đặt câu hỏi khác về chương {n}
          </Button>
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle>Tài liệu liên quan</SectionTitle>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có văn kiện hay tài liệu tham khảo gắn với chương này.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl border bg-white">
              {related.map((d) => (
                <li key={d.slug} className="border-b last:border-b-0">
                  <Link href={`/thu-vien/${d.slug}`} className="group flex items-start gap-3 p-4 transition-colors hover:bg-primary-soft">
                    <IconTile icon={KIND_ICONS[d.kind]} className="size-9" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium leading-snug group-hover:text-primary">{d.title}</span>
                      <span className="text-xs text-muted-foreground">{KIND_LABELS[d.kind]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {posts.length > 0 && (
        <section className="border-t bg-subtle">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14">
            <h2 className="text-2xl font-bold">Bài viết ôn tập</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <nav aria-label="Chuyển chương" className="border-t">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2">
          {prev ? (
            <Link href={`/mon/${subject.id}/chuong/${prev.number}`} className="group flex flex-col gap-1 rounded-xl border p-4 hover:border-primary/40">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" /> Chương {prev.number}</span>
              <span className="line-clamp-1 text-sm font-medium group-hover:text-primary">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/mon/${subject.id}/chuong/${next.number}`} className="group flex flex-col items-end gap-1 rounded-xl border p-4 text-right hover:border-primary/40">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">Chương {next.number} <ArrowRight className="size-3.5" /></span>
              <span className="line-clamp-1 text-sm font-medium group-hover:text-primary">{next.title}</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function ChapterPage(props: PageProps<"/mon/[mon]/chuong/[so]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChapterPageContent {...props} />
    </Suspense>
  );
}
