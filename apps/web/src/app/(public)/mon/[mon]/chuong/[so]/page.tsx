import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, MessageSquareText, Route } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { IconTile } from "@/components/brand";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { getSubject, SUBJECTS } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { PostCard } from "@/features/blog/components/PostCard";
import { MODE_ICONS } from "@/features/chat/mode-icons";
import { MODES } from "@/features/chat/modes";
import { chapterStudy } from "@/features/learning/server/chapter";
import { LEARN_STEPS } from "@/features/learning/steps";
import { DocCover, KIND_COLORS } from "@/features/library/components/DocCover";
import { KIND_LABELS, readerHref } from "@/features/library/types";
import { ChapterNotes } from "@/features/notes/components/ChapterNotes";
import { getQuizBank } from "@/features/quiz/server/bank";
import { StepBadge } from "@/features/review/components/steps";
import { learnHref, reviewHref } from "@/features/review/paths";
import { cn } from "@/lib/utils";

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

/**
 * Một bước học trong trang chương: số bước và tên bước lấy từ LEARN_STEPS để khớp với hướng dẫn ở /mon.
 * Các bước nối nhau bằng trục dọc bên trái giống lộ trình của môn.
 */
function LearnStep({ index, id, title, last, children }: { index: number; id: string; title: string; last?: boolean; children: ReactNode }) {
  const step = LEARN_STEPS[index];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] gap-4 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-6">
      {/* Trục dọc bắt đầu dưới vòng số một khoảng hở (vòng cao 2 + 32px, màn rộng 2 + 40px) và chạy giữa cột số. */}
      {!last && <span aria-hidden className="absolute top-10 bottom-2 left-4 w-px -translate-x-1/2 bg-border sm:top-12 sm:left-5" />}
      <div className="flex justify-center pt-0.5">
        <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground ring-4 ring-background sm:size-10 sm:text-base">
          {index + 1}
        </span>
      </div>
      <div className={cn("flex min-w-0 flex-col gap-5", !last && "pb-14")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Bước {index + 1} · {step.name}
          </span>
          <h2 id={`${id}-title`} className="text-xl font-bold sm:text-2xl">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{step.text}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

async function ChapterPageContent({ params }: PageProps<"/mon/[mon]/chuong/[so]">) {
  const data = await load(params);
  if (!data) notFound();
  const { subject, chapter } = data;
  const n = chapter.number;
  const { textbook, range, pages, concepts, questions, docs, posts } = chapterStudy(subject, n);
  const index = subject.chapters.findIndex((c) => c.number === n);
  const prev = subject.chapters[index - 1];
  const next = subject.chapters[index + 1];
  const quizSize = getQuizBank(subject.id, n)?.questions.length ?? 0;
  const hasExercises = !!EXERCISES[subject.id]?.[n];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Bài học", href: "/mon" }, { label: subject.shortName, href: learnHref(subject.id) }, { label: `Chương ${n}` }]}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">Chương {n}</span>
            {chapter.title}
          </>
        }
        lead={pages ? `${subject.name} · Giáo trình tr. ${pages.from}–${pages.to}, ${pages.count} trang` : subject.name}
        actions={
          <>
            {textbook && range && (
              <Button render={<Link href={readerHref(textbook.file, range.from)} />} nativeButton={false}>
                <BookOpen data-icon="inline-start" />
                Đọc trong giáo trình
              </Button>
            )}
            <Button variant="outline" className="bg-card" render={<Link href={`/tro-ly?mon=${subject.id}&chuong=${n}`} />} nativeButton={false}>
              <MessageSquareText data-icon="inline-start" />
              Hỏi trợ lý chương {n}
            </Button>
          </>
        }
      >
        {/* Vị trí của chương trên lộ trình môn: mỗi vạch một chương, bấm để chuyển. */}
        <nav aria-label="Vị trí trên lộ trình" className="flex max-w-md flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground/80">
              Chặng {index + 1}/{subject.chapters.length} của lộ trình
            </span>
            <Link href={learnHref(subject.id)} className="flex items-center gap-1 font-medium text-primary hover:underline">
              <Route className="size-3.5" aria-hidden />
              Xem lộ trình
            </Link>
          </div>
          <ol className="flex gap-1">
            {subject.chapters.map((c) => (
              <li key={c.number} className="flex-1">
                <Link
                  href={learnHref(subject.id, c.number)}
                  aria-label={`Chương ${c.number}: ${c.title}`}
                  aria-current={c.number === n ? "page" : undefined}
                  className={cn("block h-1.5 rounded-full transition-colors", c.number === n ? "bg-primary" : "bg-border hover:bg-primary/40")}
                />
              </li>
            ))}
          </ol>
        </nav>
      </PageHeader>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <LearnStep index={0} id="doc" title="Đọc chương trong giáo trình">
          {textbook && range && pages ? (
            <Link
              href={readerHref(textbook.file, range.from)}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft"
            >
              <DocCover doc={textbook} className="w-12" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium leading-snug group-hover:text-primary">{textbook.title}</span>
                <span className="text-xs text-muted-foreground">
                  Chương {n}: trang {pages.from}–{pages.to}, {pages.count} trang
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Giáo trình của chương đang được cập nhật.</p>
          )}

          {concepts.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold">
                Nội dung chính <span className="font-normal text-muted-foreground">· {concepts.length} mục, theo thứ tự trong giáo trình</span>
              </h3>
              <ol className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
                {concepts.map((k, i) => {
                  const body = (
                    <>
                      <span className="w-5 shrink-0 font-heading text-sm font-bold tabular-nums text-primary/60">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-sm leading-snug">
                        {k.name}
                        {k.formula && <span className="ml-1.5 rounded bg-subtle px-1.5 py-0.5 text-[11px] text-muted-foreground">công thức</span>}
                      </span>
                      {textbook && k.pdfPage && (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground group-hover:text-primary">tr. {k.pdfPage + textbook.pageOffset}</span>
                      )}
                    </>
                  );
                  return (
                    <li key={k.name} className="bg-card">
                      {textbook && k.pdfPage ? (
                        <Link href={readerHref(textbook.file, k.pdfPage)} className="group flex h-full items-start gap-3 px-4 py-3 transition-colors hover:bg-primary-soft">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex h-full items-start gap-3 px-4 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
                {/* Ô trống lấp hàng cuối khi số khái niệm lẻ, để lưới không hở nền viền. */}
                {concepts.length % 2 === 1 && <li aria-hidden className="hidden bg-card sm:block" />}
              </ol>
            </div>
          )}
        </LearnStep>

        <LearnStep index={1} id="hoi" title="Hỏi để hiểu sâu">
          {questions.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {questions.map((q) => (
                <li key={q.text}>
                  <Link
                    href={`/tro-ly?mon=${subject.id}&che-do=${q.mode}&chuong=${n}&q=${encodeURIComponent(q.text)}`}
                    className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    <IconTile icon={MODE_ICONS[q.mode]} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-medium leading-snug">{q.text}</span>
                      <span className="text-xs text-muted-foreground">{MODES[q.mode].label}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button variant="link" render={<Link href={`/tro-ly?mon=${subject.id}&chuong=${n}`} />} nativeButton={false} className="self-start px-0">
            <MessageSquareText data-icon="inline-start" />
            Đặt câu hỏi khác về chương {n}
          </Button>
        </LearnStep>

        <LearnStep index={2} id="mo-rong" title="Văn kiện và bài viết liên quan">
          {docs.length === 0 && posts.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có văn kiện, tài liệu tham khảo hay bài viết gắn với chương này.</p>
          )}
          {docs.length > 0 && (
            <ul className="overflow-hidden rounded-xl border bg-card">
              {docs.map((d) => (
                <li key={d.slug} className="border-b last:border-b-0">
                  <Link href={`/thu-vien/${d.slug}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-primary-soft">
                    <DocCover doc={d} className="w-12" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", KIND_COLORS[d.kind].text)}>{KIND_LABELS[d.kind]}</span>
                      <span className="text-sm font-medium leading-snug group-hover:text-primary">{d.title}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {posts.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {posts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </LearnStep>

        <LearnStep index={3} id="ghi-chep" title="Ghi chú và tạo thẻ của riêng mình" last>
          <p className="text-sm leading-relaxed text-foreground/80">
            Trong trình đọc, chọn <b>Ghi chú</b>, <b>Vào sổ</b> hoặc <b>Tạo thẻ</b> sau khi bôi đen. Ghi chú và trang{" "}
            <Link href="/so-ghi-chep" className="font-medium text-primary hover:underline">sổ ghi chép</Link> gắn chương này hiện lại ở đây; thẻ tự tạo
            được ôn cùng bộ thẻ của chương ở Ôn tập.
          </p>
          <Suspense fallback={null}>
            <ChapterNotes subject={subject.id} chapter={n} hasDeck={concepts.length > 0} />
          </Suspense>
        </LearnStep>
      </div>

      {/* Bài học chỉ để học; mọi hoạt động luyện nằm ở nhánh Ôn tập. Dải cuối trang này là lối sang. */}
      <section aria-labelledby="sang-on-tap" className="border-t bg-primary-soft">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex max-w-2xl flex-col gap-2">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <StepBadge n={5} />
              Bước tiếp theo
            </span>
            <h2 id="sang-on-tap" className="text-2xl font-bold">
              Học xong chương {n}? Chuyển sang ôn tập
            </h2>
            <p className="text-sm text-foreground/80">
              {[
                concepts.length > 0 && `${concepts.length} thẻ ghi nhớ`,
                quizSize > 0 && `${quizSize} câu trắc nghiệm`,
                hasExercises && "bài tập tính toán",
                "câu hỏi tự luận với trợ lý",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button size="lg" className="shrink-0 self-start md:self-auto" render={<Link href={reviewHref(subject.id, n)} />} nativeButton={false}>
            Ôn tập chương {n}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <nav aria-label="Chuyển chương" className="border-t">
        <div className="mx-auto grid max-w-4xl gap-4 px-4 py-8 sm:grid-cols-2">
          {prev ? (
            <Link href={learnHref(subject.id, prev.number)} className="group flex flex-col gap-1 rounded-xl border p-4 hover:border-primary/40">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" /> Chặng trước · Chương {prev.number}</span>
              <span className="line-clamp-1 text-sm font-medium group-hover:text-primary">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={learnHref(subject.id, next.number)} className="group flex flex-col items-end gap-1 rounded-xl border p-4 text-right hover:border-primary/40">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">Chặng sau · Chương {next.number} <ArrowRight className="size-3.5" /></span>
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
