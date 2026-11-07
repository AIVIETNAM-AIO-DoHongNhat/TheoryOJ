import { CalendarClock, Clock, History, ListChecks, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubject } from "@/config/subjects";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { ExamReview } from "@/features/exams/components/ExamReview";
import { ExamRunner } from "@/features/exams/components/ExamRunner";
import { PhaseBadge } from "@/features/exams/components/PhaseBadge";
import { StartExamButton } from "@/features/exams/components/StartExamButton";
import { durationText, EXAM_PASS_RATIO, score10 } from "@/features/exams/logic";
import { getStudentExam } from "@/features/exams/server/exams";
import { formatVnTime } from "@/features/exams/time";
import { getLibrary } from "@/features/library/server/catalog";
import { readerHref } from "@/features/library/types";
import { getCurrentUser, isStudent } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Làm đề thi" };

type Params = Promise<{ id: string }>;

async function ExamContent({ params }: { params: Params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!isStudent(user)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <StudentGate user={user} next={`/de-thi/${id}`} action="làm đề thi" className="mx-auto max-w-3xl" />
      </div>
    );
  }
  const view = /^\d+$/.test(id) ? await getStudentExam(user, Number(id)) : null;
  if (!view) notFound();
  const { exam, phase, attempts, current, review } = view;

  const done = attempts.filter((a) => a.submittedAt);
  const last = done.at(-1);
  const best = done.reduce<(typeof done)[number] | null>((b, a) => (!b || (a.score ?? 0) / a.total > (b.score ?? 0) / b.total ? a : b), null);
  const left = exam.maxAttempts - done.length;
  const textbook = getLibrary().find((d) => d.subject === exam.subject && d.kind === "giao_trinh");
  const pageHref = textbook ? (page: number) => `${readerHref(textbook.file)}?trang=${page - textbook.pageOffset}` : null;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Đề thi", href: "/de-thi" }, { label: exam.title }]}
        title={exam.title}
        lead={exam.description || undefined}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <PhaseBadge phase={phase} />
          <span>{getSubject(exam.subject)?.name}</span>
          <span className="flex items-center gap-1.5"><ListChecks className="size-4" />{exam.questionCount} câu</span>
          <span className="flex items-center gap-1.5"><Clock className="size-4" />{durationText(exam.durationMin)}</span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            {phase === "sap-mo" ? `Mở lúc ${formatVnTime(exam.opensAt)}` : exam.closesAt ? `Hạn ${formatVnTime(exam.closesAt)}` : "Không có hạn"}
          </span>
        </div>
      </PageHeader>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:py-12">
        {current ? (
          <ExamRunner
            key={current.attemptId}
            attemptId={current.attemptId}
            deadline={current.deadline}
            serverNow={view.serverNow}
            paper={current.paper}
            initialAnswers={current.answers}
          />
        ) : (
          <>
            <Card className={cn("max-w-3xl", last && "bg-subtle")}>
              <CardHeader>
                <CardDescription>
                  {last ? (last.autoSubmitted ? "Bài được tự nộp khi hết giờ" : `Đã nộp lúc ${formatVnTime(last.submittedAt)}`) : "Chưa làm"}
                </CardDescription>
                {best ? (
                  <CardTitle className={cn("font-heading text-4xl font-bold tabular-nums", (best.score ?? 0) / best.total >= EXAM_PASS_RATIO ? "text-primary" : "text-destructive")}>
                    {score10(best.score, best.total)} <span className="text-lg font-medium text-muted-foreground">điểm · {best.score}/{best.total} câu đúng</span>
                  </CardTitle>
                ) : (
                  <CardTitle className="text-xl">
                    {phase === "sap-mo" ? "Đề chưa tới giờ mở" : phase === "da-dong" ? "Đề đã đóng" : "Sẵn sàng làm bài"}
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                {done.length > 1 && (
                  <p className="flex items-center gap-1.5"><Trophy className="size-4" /> Điểm cao nhất trong {done.length} lượt đã làm.</p>
                )}
                {done.length > 0 && !view.answersVisible && (
                  <p>
                    {exam.reveal === "chi-diem"
                      ? "Đề này chỉ cho xem điểm, không hiện đáp án."
                      : `Đáp án và giải thích hiện sau khi đề đóng${exam.closesAt ? ` (${formatVnTime(exam.closesAt)})` : ""}.`}
                  </p>
                )}
                {phase === "dang-mo" && (
                  <p>{left > 0 ? `Còn ${left}/${exam.maxAttempts} lượt làm.` : "Đồng chí đã dùng hết số lượt làm."}</p>
                )}
              </CardContent>
              {view.canStart && (
                <CardFooter>
                  <StartExamButton examId={exam.id} durationMin={exam.durationMin} label={done.length ? "Làm lượt mới" : "Bắt đầu làm bài"} />
                </CardFooter>
              )}
            </Card>

            {done.length > 1 && (
              <section className="flex max-w-3xl flex-col gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold"><History className="size-5" /> Các lượt đã làm</h2>
                <ul className="divide-y rounded-xl border bg-card text-sm">
                  {done.map((a, i) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span>Lượt {i + 1} · {formatVnTime(a.submittedAt)}</span>
                      <b className="tabular-nums">{score10(a.score, a.total)} điểm ({a.score}/{a.total})</b>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {review && (
              <section className="flex flex-col gap-4">
                <h2 className="text-xl font-bold">Xem lại bài{done.length > 1 ? " lượt gần nhất" : ""}</h2>
                <ExamReview items={review.items} subject={exam.subject} pageHref={pageHref} />
              </section>
            )}

            {phase === "da-dong" && done.length === 0 && (
              <Alert className="max-w-3xl">
                <AlertTitle>Đồng chí chưa làm đề này</AlertTitle>
                <AlertDescription>Đề đã hết hạn. Nếu có lý do chính đáng, liên hệ giảng viên để được mở lại lượt làm.</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function ExamPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExamContent params={params} />
    </Suspense>
  );
}
