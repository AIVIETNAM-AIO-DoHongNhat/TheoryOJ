import { ArrowRight, BookOpen, Flag, GraduationCap, Library, MessageSquareText, Newspaper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getSubject, SUBJECTS } from "@/config/subjects";
import { chapterStudy } from "@/features/learning/server/chapter";
import { getLibrary } from "@/features/library/server/catalog";
import { readerHref } from "@/features/library/types";
import { learnHref, reviewHref } from "@/features/review/paths";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ mon: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/mon/[mon]">): Promise<Metadata> {
  const subject = getSubject((await params).mon);
  return subject ? { title: `Bài học ${subject.name}` } : {};
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Số khái niệm hiện trên mỗi chặng; phần còn lại gộp thành "+n". */
const CONCEPTS_SHOWN = 4;

/**
 * Một chặng trên lộ trình: mốc tròn bên trái nằm trên trục dọc, nội dung bên phải.
 * Trục nối từ mốc này xuống mốc sau; chặng cuối không vẽ trục.
 */
function Stop({ marker, last, children }: { marker: ReactNode; last?: boolean; children: ReactNode }) {
  return (
    <li className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-6">
      {!last && <span aria-hidden className="absolute top-12 bottom-0 left-[1.375rem] w-px bg-border sm:top-14 sm:left-[1.625rem]" />}
      <div className="relative flex justify-center">{marker}</div>
      <div className={cn("min-w-0", !last && "pb-6")}>{children}</div>
    </li>
  );
}

function Marker({ children, filled }: { children: ReactNode; filled?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-11 items-center justify-center rounded-full border-2 font-heading text-base font-bold tabular-nums sm:size-13 sm:text-lg",
        filled ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 bg-card text-primary",
      )}
    >
      {children}
    </span>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof BookOpen; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

async function SubjectPageContent({ params }: PageProps<"/mon/[mon]">) {
  const subject = getSubject((await params).mon);
  if (!subject) notFound();
  if (!subject.active) {
    return (
      <>
        <PageHeader crumbs={[{ label: "Bài học", href: "/mon" }, { label: subject.name }]} title={subject.name} lead={subject.description} />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyTitle>Bài học đang được biên soạn</EmptyTitle>
              <EmptyDescription>Khoa đang chuẩn bị giáo trình, tài liệu và câu hỏi cho môn này. Đồng chí xem các môn đã triển khai ở trang Bài học.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" render={<Link href="/mon" />} nativeButton={false}>
              Các môn đã triển khai
            </Button>
          </Empty>
        </div>
      </>
    );
  }

  const textbook = getLibrary().find((d) => d.subject === subject.id && d.kind === "giao_trinh");
  const chapters = subject.chapters.map((c) => ({ ...c, study: chapterStudy(subject, c.number) }));
  const totalPages = chapters.reduce((a, c) => a + (c.study.pages?.count ?? 0), 0);
  const totalConcepts = chapters.reduce((a, c) => a + c.study.concepts.length, 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Bài học", href: "/mon" }, { label: subject.name }]}
        title={subject.name}
        lead={`${subject.description} Lộ trình đi lần lượt ${subject.chapters.length} chương; mỗi chương học theo bốn bước rồi chuyển sang ôn tập.`}
        actions={
          <>
            <Button render={<Link href={`/tro-ly?mon=${subject.id}`} />} nativeButton={false}>
              <MessageSquareText data-icon="inline-start" />
              Hỏi trợ lý môn này
            </Button>
            <Button variant="outline" className="bg-card" render={<Link href={reviewHref(subject.id)} />} nativeButton={false}>
              <GraduationCap data-icon="inline-start" />
              Ôn tập môn này
            </Button>
          </>
        }
      >
        <dl className="grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
          {[
            { label: "Chương", value: subject.chapters.length },
            { label: "Trang giáo trình", value: totalPages },
            { label: "Nội dung chính", value: totalConcepts },
          ].map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-0.5 bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="font-heading text-2xl font-bold tabular-nums text-primary">{s.value.toLocaleString("vi-VN")}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold">Lộ trình học</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Học theo thứ tự từ trên xuống; chương sau dựa trên kiến thức của chương trước. Chọn một chặng để vào học.{" "}
            <Link href="/mon#cach-hoc" className="font-medium text-primary hover:underline">
              Cách học một chương
            </Link>
          </p>
        </div>

        <ol aria-label={`Lộ trình môn ${subject.name}`}>
          <Stop marker={<Marker><Flag className="size-5" strokeWidth={2} aria-hidden /></Marker>}>
            <div className="flex flex-col gap-1 pt-1.5 sm:pt-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bắt đầu</span>
              <p className="text-[15px] font-semibold leading-snug">Chuẩn bị giáo trình của môn</p>
              {textbook ? (
                <p className="text-sm text-muted-foreground">
                  {textbook.title}.{" "}
                  <Link href={readerHref(textbook.file)} className="font-medium text-primary hover:underline">
                    Mở giáo trình
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Giáo trình của môn đang được cập nhật.</p>
              )}
            </div>
          </Stop>

          {chapters.map((c) => {
            const { pages, concepts, questions, docs, posts } = c.study;
            // Thẻ có mặt trước là câu hỏi dài không hợp làm nhãn: ưu tiên tên khái niệm ngắn.
            const chips = concepts.filter((k) => !k.name.includes("?") && k.name.length <= 48).slice(0, CONCEPTS_SHOWN);
            const rest = concepts.length - chips.length;
            return (
              <Stop key={c.number} marker={<Marker>{pad(c.number)}</Marker>}>
                <article className="group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition duration-300 hover:border-primary/40 hover:shadow-card sm:p-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Chặng {c.number}
                      <span className="font-medium normal-case tracking-normal text-muted-foreground">
                        · {pages ? `tr. ${pages.from}–${pages.to}, ${pages.count} trang` : "Chưa có phạm vi trang"}
                      </span>
                    </span>
                    <h3 className="text-lg font-bold leading-snug">
                      {/* Lớp phủ after: cả thẻ bấm được. */}
                      <Link href={learnHref(subject.id, c.number)} className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary">
                        {c.title}
                      </Link>
                    </h3>
                  </div>

                  {concepts.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground">Nội dung chính</span>
                      <ul className="flex flex-wrap gap-1.5">
                        {chips.map((k) => (
                          <li key={k.name} className="rounded-md bg-subtle px-2 py-1 text-xs leading-snug text-foreground/85">
                            {k.name}
                          </li>
                        ))}
                        {rest > 0 && <li className="px-1 py-1 text-xs text-muted-foreground">+{rest} nội dung</li>}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                      {pages && <Meta icon={BookOpen}>{pages.count} trang đọc</Meta>}
                      {questions.length > 0 && <Meta icon={MessageSquareText}>{questions.length} câu hỏi gợi ý</Meta>}
                      {docs.length > 0 && <Meta icon={Library}>{docs.length} tài liệu</Meta>}
                      {posts.length > 0 && <Meta icon={Newspaper}>{posts.length} bài viết</Meta>}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                      Vào học
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </article>
              </Stop>
            );
          })}

          <Stop last marker={<Marker filled><GraduationCap className="size-5" strokeWidth={2} aria-hidden /></Marker>}>
            <div className="flex flex-col gap-3 pt-1.5 sm:pt-2.5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Hoàn thành môn</span>
                <p className="text-[15px] font-semibold leading-snug">Ôn lại toàn môn trước khi thi</p>
                <p className="text-sm text-muted-foreground">
                  Mỗi chương ôn theo bốn bước ở Ôn tập; cuối cùng ôn thi cả môn với trợ lý bằng câu hỏi tự luận.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button render={<Link href={reviewHref(subject.id)} />} nativeButton={false}>
                  Ôn tập môn này
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button variant="outline" render={<Link href={`/tro-ly?mon=${subject.id}&che-do=review`} />} nativeButton={false}>
                  Ôn thi với trợ lý
                </Button>
              </div>
            </div>
          </Stop>
        </ol>
      </div>
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function SubjectPage(props: PageProps<"/mon/[mon]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SubjectPageContent {...props} />
    </Suspense>
  );
}
