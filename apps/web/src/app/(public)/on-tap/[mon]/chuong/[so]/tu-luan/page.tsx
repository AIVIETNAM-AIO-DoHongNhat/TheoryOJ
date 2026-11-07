import { BookOpen, PenLine, Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { docsForChapter } from "@/features/library/server/catalog";
import { readerHref } from "@/features/library/types";
import { AnswerRunner } from "@/features/open-answer/components/AnswerRunner";
import { latestAttempts } from "@/features/open-answer/server/attempts";
import { essayCounts, getEssayBank, pageSpan, rebuttalBanks } from "@/features/open-answer/server/bank";
import type { GradeResponse } from "@/features/open-answer/types";
import { rebuttalHref, reviewCrumbs, reviewHref } from "@/features/review/paths";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return ACTIVE_SUBJECTS.flatMap((s) => {
    const counts = essayCounts(s.id, s.chapters.map((c) => c.number));
    return s.chapters.filter((c) => counts[c.number]).map((c) => ({ mon: s.id, so: String(c.number) }));
  });
}

type Props = PageProps<"/on-tap/[mon]/chuong/[so]/tu-luan">;

async function load(params: Props["params"]) {
  const { mon, so } = await params;
  const subject = getSubject(mon);
  const chapter = subject?.chapters.find((c) => c.number === Number(so));
  const bank = subject?.active && chapter ? getEssayBank(subject.id, chapter.number) : null;
  return subject && chapter && bank?.questions.length ? { subject, chapter, bank } : null;
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const data = await load(params);
  return data ? { title: `Tự luận chương ${data.chapter.number}` } : {};
}

async function EssayPageContent({ params, searchParams }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { subject, chapter, bank } = data;
  await connection();
  const { cau } = await searchParams;
  const question = bank.questions.find((q) => q.id === cau) ?? bank.questions[0];
  const user = await getCurrentUser();
  const latest = user ? await latestAttempts(user.visitorId, subject.id, "tu_luan", bank.questions.map((q) => q.id)) : new Map();
  const previous = latest.get(question.id);
  const initial: GradeResponse | null = previous
    ? {
        attemptId: previous.id,
        result: previous.result,
        rubric: previous.rubric,
        citations: previous.citations,
        lecturerScore: previous.lecturerScore,
        lecturerNote: previous.lecturerNote,
      }
    : null;

  const textbook = docsForChapter(subject.id, chapter.number).find((d) => d.kind === "giao_trinh");
  const span = pageSpan(question.rubric);
  const hasRebuttals = rebuttalBanks(subject.id, [chapter.number], user?.role === "giang-vien").length > 0;
  const href = (id: string) => `${reviewHref(subject.id, chapter.number, "tu-luan")}?cau=${id}`;

  return (
    <>
      <PageHeader
        crumbs={reviewCrumbs(subject, chapter.number, "tu-luan")}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Tự luận chương {chapter.number}
            </span>
            {chapter.title}
          </>
        }
        lead="Viết bài như khi thi. Hệ thống chấm từng ý theo barem do Khoa duyệt, chỉ ra câu nào trong bài đạt ý, ý nào còn thiếu kèm trang giáo trình, rồi hỏi vặn ý yếu nhất như thi vấn đáp."
        actions={
          hasRebuttals ? (
            <Button variant="outline" className="bg-card" render={<Link href={rebuttalHref(subject.id)} />} nativeButton={false}>
              <Swords data-icon="inline-start" />
              Đấu trường phản bác
            </Button>
          ) : undefined
        }
      >
        {!bank.reviewed && <Badge variant="outline" className="self-start bg-card">Câu hỏi và barem đang chờ giảng viên duyệt</Badge>}
      </PageHeader>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-10 sm:py-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Câu hỏi của chương" className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Câu hỏi</span>
          <ol className="flex flex-col gap-1.5">
            {bank.questions.map((q, i) => {
              const done = latest.get(q.id);
              return (
                <li key={q.id}>
                  <Link
                    href={href(q.id)}
                    aria-current={q.id === question.id ? "page" : undefined}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-primary-soft",
                      q.id === question.id && "border-primary bg-primary-soft",
                    )}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                      Câu {i + 1}
                      {done && (
                        <span className="ml-auto tabular-nums text-muted-foreground">
                          {(done.lecturerScore ?? done.result.score).toLocaleString("vi-VN")}/{done.result.maxScore}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-3 leading-snug">{q.q}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <PenLine className="size-4" />
              Đề bài · 10 điểm
            </span>
            <h2 className="text-lg font-bold leading-snug">{question.q}</h2>
            {textbook && span && (
              <Link
                href={readerHref(textbook.file, span[0] - textbook.pageOffset)}
                className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-primary"
              >
                <BookOpen className="size-4" />
                Ôn lại giáo trình tr. {span[0]}{span[1] !== span[0] ? `–${span[1]}` : ""} trước khi viết
              </Link>
            )}
          </section>

          {user ? (
            <>
              {user.role === "giang-vien" && (
                <Alert>
                  <AlertDescription>Đồng chí đang thử bằng tài khoản giảng viên; lượt làm không tính vào số liệu học viên.</AlertDescription>
                </Alert>
              )}
              <AnswerRunner
                key={question.id}
                target={{ kind: "tu_luan", subject: subject.id, chapter: chapter.number, itemId: question.id }}
                initial={initial}
                initialAnswer={previous?.answer}
              />
            </>
          ) : (
            <StudentGate user={user} next={href(question.id)} action="làm bài tự luận" />
          )}
        </div>
      </div>
    </>
  );
}

export default function EssayPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EssayPageContent {...props} />
    </Suspense>
  );
}
