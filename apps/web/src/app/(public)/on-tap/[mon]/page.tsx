import { ArrowRight, ArrowUpRight, BookOpen, CircleHelp, Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getSubject, SUBJECTS, type Subject } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { MODE_ICONS } from "@/features/chat/mode-icons";
import { MODES } from "@/features/chat/modes";
import { deckCounts } from "@/features/flashcards/server/deck";
import { getLibrary } from "@/features/library/server/catalog";
import { essayCounts } from "@/features/open-answer/server/bank";
import { type LibraryDoc, printedPage, readerHref } from "@/features/library/types";
import { quizCounts } from "@/features/quiz/server/bank";
import { QUIZ_SIZE } from "@/features/quiz/types";
import { type OutlineItem, ReviewOutline } from "@/features/review/components/ReviewOutline";
import { StepBadge, STEPS } from "@/features/review/components/steps";
import { learnHref, rebuttalHref, type ReviewActivity, reviewHref } from "@/features/review/paths";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ mon: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/on-tap/[mon]">): Promise<Metadata> {
  const subject = getSubject((await params).mon);
  return subject ? { title: `Ôn tập ${subject.name}` } : {};
}

const ReviewIcon = MODE_ICONS.review;
const pad = (n: number) => String(n).padStart(2, "0");
const sum = (r: Record<number, number>) => Object.values(r).reduce((a, b) => a + b, 0);

/** Một ô bước trong chương. Chương chưa có hoạt động đó thì ô nhạt, không bấm được. */
function StepCell({ step, href, hint }: { step: number; href?: string; hint: string }) {
  const { icon: Icon, name, tool } = STEPS[step];
  const body = (
    <>
      <span className="flex items-center gap-2">
        <StepBadge n={step + 1} muted={!href} />
        <span className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", href ? "text-primary" : "text-muted-foreground")}>{name}</span>
        {href ? (
          <ArrowUpRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
        ) : (
          <Icon className="ml-auto size-4 text-muted-foreground/60" strokeWidth={1.75} aria-hidden />
        )}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold leading-tight">{tool}</span>
        <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
      </span>
    </>
  );
  const base = "flex h-full flex-col gap-2.5 p-4";
  return href ? (
    <Link href={href} className={cn(base, "group bg-card transition-colors hover:bg-primary-soft")}>
      {body}
    </Link>
  ) : (
    <div aria-disabled className={cn(base, "bg-subtle text-muted-foreground")}>
      {body}
    </div>
  );
}

function ChapterBlock({
  subject, chapter, textbook, decks, quiz, essays, hasExercise,
}: {
  subject: Subject;
  chapter: Subject["chapters"][number];
  textbook?: LibraryDoc;
  decks?: number;
  quiz?: number;
  essays?: number;
  hasExercise: boolean;
}) {
  const range = textbook?.chapters.find((r) => r.number === chapter.number);
  const learn = learnHref(subject.id, chapter.number);
  const practice = (a: ReviewActivity) => reviewHref(subject.id, chapter.number, a);
  const id = `chuong-${chapter.number}`;
  return (
    <li id={id} aria-labelledby={`${id}-title`} className="scroll-mt-40 overflow-hidden rounded-xl border bg-card lg:scroll-mt-24">
      <div className="flex items-start gap-4 p-5">
        <span className="font-heading text-4xl font-bold leading-none text-primary tabular-nums">{pad(chapter.number)}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Chương {chapter.number} / {subject.chapters.length}
          </span>
          <h2 id={`${id}-title`} className="text-base font-bold leading-snug sm:text-[17px]">
            {chapter.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {textbook && range && (
              <Link href={readerHref(textbook.file, range.from)} className="flex items-center gap-1.5 hover:text-primary">
                <BookOpen className="size-3.5" aria-hidden />
                Giáo trình tr. {printedPage(textbook, range.from)}–{printedPage(textbook, range.to)}
              </Link>
            )}
            <Link href={learn} className="flex items-center gap-1 hover:text-primary">
              Bài học của chương
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
      <ol className="grid grid-cols-2 gap-px border-t bg-border xl:grid-cols-4">
        <li>
          <StepCell step={0} href={decks ? practice("the-ghi-nho") : undefined} hint={decks ? `${decks} thẻ` : "Chưa có thẻ"} />
        </li>
        <li>
          <StepCell step={1} href={quiz ? practice("trac-nghiem") : undefined} hint={quiz ? `${quiz} câu, đề ${QUIZ_SIZE} câu` : "Chưa có câu hỏi"} />
        </li>
        <li>
          <StepCell step={2} href={hasExercise ? practice("bai-tap") : undefined} hint={hasExercise ? "Số liệu đổi mỗi lần" : "Chương không có công thức"} />
        </li>
        <li>
          <StepCell
            step={3}
            href={essays ? practice("tu-luan") : `/tro-ly?mon=${subject.id}&che-do=review&chuong=${chapter.number}`}
            hint={essays ? `${essays} câu, chấm theo barem` : `Ôn tự luận với trợ lý`}
          />
        </li>
      </ol>
    </li>
  );
}

async function ReviewSubjectContent({ params }: PageProps<"/on-tap/[mon]">) {
  const subject = getSubject((await params).mon);
  if (!subject) notFound();
  const crumbs = [{ label: "Ôn tập", href: "/on-tap" }, { label: subject.name }];

  if (!subject.active) {
    return (
      <>
        <PageHeader crumbs={crumbs} title={subject.name} lead={subject.description} />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyTitle>Bộ ôn tập đang được biên soạn</EmptyTitle>
              <EmptyDescription>Khoa đang chuẩn bị thẻ ghi nhớ, trắc nghiệm và câu hỏi cho môn này. Đồng chí chọn một môn đã triển khai để ôn.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" render={<Link href="/on-tap" />} nativeButton={false}>
              Chọn môn khác
            </Button>
          </Empty>
        </div>
      </>
    );
  }

  const textbook = getLibrary().find((d) => d.subject === subject.id && d.kind === "giao_trinh");
  const numbers = subject.chapters.map((c) => c.number);
  const quiz = await quizCounts(subject.id, numbers);
  const decks = deckCounts(subject.id, numbers);
  const essays = essayCounts(subject.id, numbers);
  const exercises = numbers.filter((n) => EXERCISES[subject.id]?.[n]);
  const stats = [
    { label: "Chương", value: subject.chapters.length },
    { label: "Thẻ ghi nhớ", value: sum(decks) },
    { label: "Câu trắc nghiệm", value: sum(quiz) },
    { label: "Chương có bài tập", value: exercises.length },
  ];
  const outline: OutlineItem[] = subject.chapters.map((c) => ({ id: `chuong-${c.number}`, short: `Chương ${c.number}`, label: c.title, number: c.number }));

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={subject.name}
        lead={`${subject.description} Mỗi chương có bốn bước ôn đánh số theo thứ tự, kết quả từng lượt được lưu vào bảng tiến độ.`}
        actions={
          <>
            <Button render={<Link href={`/tro-ly?mon=${subject.id}&che-do=review`} />} nativeButton={false}>
              <ReviewIcon data-icon="inline-start" />
              {MODES.review.label} cả môn
            </Button>
            <Button variant="outline" className="bg-card" render={<Link href={rebuttalHref(subject.id)} />} nativeButton={false}>
              <Swords data-icon="inline-start" />
              Đấu trường phản bác
            </Button>
            <Button variant="outline" className="bg-card" render={<Link href={learnHref(subject.id)} />} nativeButton={false}>
              Lộ trình học của môn
              <ArrowRight data-icon="inline-end" />
            </Button>
          </>
        }
      >
        <dl className="grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-0.5 bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="font-heading text-2xl font-bold tabular-nums text-primary">{s.value.toLocaleString("vi-VN")}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
          <ReviewOutline subject={subject.shortName} subjectName={subject.name} items={outline} />

          <div className="flex min-w-0 flex-col gap-5">
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <CircleHelp className="size-4 shrink-0" aria-hidden />
              Ô nhạt là bước chương đó chưa có.
              <Link href="/on-tap#cach-on" className="font-medium text-primary hover:underline">
                Xem cách ôn bốn bước
              </Link>
            </p>
            <ol className="flex flex-col gap-5" aria-label={`Các chương môn ${subject.name}`}>
              {subject.chapters.map((c) => (
                <ChapterBlock
                  key={c.number}
                  subject={subject}
                  chapter={c}
                  textbook={textbook}
                  decks={decks[c.number]}
                  quiz={quiz[c.number]}
                  essays={essays[c.number]}
                  hasExercise={exercises.includes(c.number)}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function ReviewSubjectPage(props: PageProps<"/on-tap/[mon]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReviewSubjectContent {...props} />
    </Suspense>
  );
}
