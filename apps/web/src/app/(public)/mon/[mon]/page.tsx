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

/** Độ nghiêng của thẻ, như giấy ghim tay lên bảng. */
const TILTS = [-1.4, 1.2, -0.9, 1.5, -1.1, 0.8];

/**
 * Một chặng trên bảng ghim: thẻ giấy có đinh ghim ở đỉnh, xen kẽ trái phải (màn rộng) hoặc thẳng hàng (màn hẹp).
 * Đường nét đứt nối từ chân thẻ này tới đinh ghim của thẻ sau; chặng cuối không vẽ.
 * Thẻ rộng 60% nên tâm thẻ trái ở 30%, thẻ phải ở 70%: hai đầu đường nối đặt đúng hai điểm đó.
 * Mọi chặng cùng màu chủ đạo (--primary) để hợp tông với cả trang, tự đổi theo giao diện sáng, tối.
 */
function Stop({ index, last, children }: { index: number; last?: boolean; children: ReactNode }) {
  const right = index % 2 === 1;
  const tilt = TILTS[index % TILTS.length];
  const [from, to] = right ? [70, 30] : [30, 70];
  return (
    <li className={cn("relative", !last && "pb-14 md:pb-16")}>
      <div
        style={{ "--nghieng": `${tilt}deg` } as React.CSSProperties}
        className={cn(
          "group/stop relative w-full transition-transform duration-300 md:w-[60%] md:rotate-(--nghieng) md:hover:rotate-0",
          right ? "md:ml-auto" : "md:mr-auto",
        )}
      >
        <Pin />
        {/* Nền bảng trắng nên khung ngoài cần viền và bóng rõ, ruột thẻ đậm hơn một bậc để không chìm. */}
        <div className="relative rounded-2xl bg-card p-2.5 shadow-[0_1px_2px_rgb(10_26_16/0.06),0_16px_36px_-16px_rgb(5_46_22/0.3)] ring-1 ring-foreground/10 transition-shadow duration-300 group-hover/stop:shadow-float">
          <div className="rounded-xl bg-primary/10 p-4 ring-1 ring-primary/15 sm:p-5">
            {children}
          </div>
        </div>
      </div>
      {!last && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full overflow-visible text-muted-foreground/50 md:h-16"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="5 6"
          strokeLinecap="round"
        >
          {/* Màn hẹp: đường thẳng giữa; màn rộng: đường cong chữ S từ thẻ này sang thẻ kia. */}
          <path d="M 50 4 L 50 92" vectorEffect="non-scaling-stroke" className="md:hidden" />
          <path d={`M ${from} 4 C ${from} 55, ${to} 45, ${to} 92`} vectorEffect="non-scaling-stroke" className="hidden md:block" />
        </svg>
      )}
    </li>
  );
}

/** Đinh ghim tròn có vệt sáng và bóng đổ, cắm ở mép trên thẻ. */
function Pin() {
  return (
    <span aria-hidden className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
      <span className="absolute top-4 left-1/2 h-2 w-5 -translate-x-1/2 rounded-full bg-black/25 blur-[3px]" />
      <span className="relative block size-6 rounded-full bg-primary bg-[radial-gradient(circle_at_35%_30%,rgb(255_255_255/0.7),transparent_38%)] shadow-[inset_0_-2px_3px_rgb(0_0_0/0.25),0_3px_6px_-1px_rgb(0_0_0/0.35)]" />
    </span>
  );
}

/** Số chặng ở đầu thẻ. */
function StopLabel({ children }: { children: ReactNode }) {
  return <span className="font-heading text-[28px] leading-none font-light tabular-nums text-primary">{children}</span>;
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

      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold">Lộ trình học</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Học theo thứ tự từ trên xuống; chương sau dựa trên kiến thức của chương trước. Chọn một chặng để vào học.{" "}
            <Link href="/mon#cach-hoc" className="font-medium text-primary hover:underline">
              Cách học một chương
            </Link>
          </p>
        </div>

        {/* Bảng ghim nền trắng (lớp .nen-bang-ghim ở globals.css). */}
        <div className="nen-bang-ghim rounded-3xl border px-4 py-12 sm:px-8 md:px-12 md:py-14">
          <ol aria-label={`Lộ trình môn ${subject.name}`}>
            <Stop index={0}>
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-2">
                  <Flag className="size-5 text-primary" aria-hidden />
                  <span className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Bắt đầu</span>
                </span>
                <p className="text-lg font-bold leading-snug">Chuẩn bị giáo trình của môn</p>
                {textbook ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
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

            {chapters.map((c, i) => {
              const { pages, concepts, questions, docs, posts } = c.study;
              // Thẻ có mặt trước là câu hỏi dài không hợp làm nhãn: ưu tiên tên khái niệm ngắn.
              const chips = concepts.filter((k) => !k.name.includes("?") && k.name.length <= 48).slice(0, CONCEPTS_SHOWN);
              const rest = concepts.length - chips.length;
              return (
                <Stop key={c.number} index={i + 1}>
                  <article className="group flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <StopLabel>{pad(c.number)}</StopLabel>
                        <span className="text-xs text-muted-foreground">
                          {pages ? `Giáo trình tr. ${pages.from}–${pages.to}` : "Chưa có phạm vi trang"}
                        </span>
                      </span>
                      <h3 className="text-lg font-bold leading-snug">
                        {/* Lớp phủ after phủ cả thẻ giấy (kể cả viền trắng) để bấm chỗ nào cũng vào học. */}
                        <Link href={learnHref(subject.id, c.number)} className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary">
                          {c.title}
                        </Link>
                      </h3>
                    </div>

                    {concepts.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5" aria-label="Nội dung chính">
                        {chips.map((k) => (
                          <li key={k.name} className="rounded-md bg-card/80 px-2 py-1 text-xs leading-snug text-foreground/85 ring-1 ring-foreground/5">
                            {k.name}
                          </li>
                        ))}
                        {rest > 0 && <li className="px-1 py-1 text-xs text-muted-foreground">+{rest} nội dung</li>}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground">
                      <span className="flex flex-wrap gap-x-4 gap-y-1">
                        {pages && <Meta icon={BookOpen}>{pages.count} trang</Meta>}
                        {questions.length > 0 && <Meta icon={MessageSquareText}>{questions.length} câu hỏi</Meta>}
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

            <Stop index={chapters.length + 1} last>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-5 text-primary" aria-hidden />
                    <span className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Hoàn thành môn</span>
                  </span>
                  <p className="text-lg font-bold leading-snug">Ôn lại toàn môn trước khi thi</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Mỗi chương ôn theo bốn bước ở Ôn tập; cuối cùng ôn thi cả môn với trợ lý bằng câu hỏi tự luận.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button render={<Link href={reviewHref(subject.id)} />} nativeButton={false}>
                    Ôn tập môn này
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <Button variant="outline" className="bg-card" render={<Link href={`/tro-ly?mon=${subject.id}&che-do=review`} />} nativeButton={false}>
                    Ôn thi với trợ lý
                  </Button>
                </div>
              </div>
            </Stop>
          </ol>
        </div>
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
