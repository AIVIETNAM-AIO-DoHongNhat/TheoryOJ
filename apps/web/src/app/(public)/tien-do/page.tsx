import { ArrowRight, Calculator, ListChecks, MessageSquareText, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS, type Subject } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { type ChapterProgress, getProgress } from "@/features/progress/server/progress";
import { quizCounts } from "@/features/quiz/server/bank";
import { PASS_RATIO, QUIZ_SIZE } from "@/features/quiz/types";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { title: "Tiến độ ôn tập" };

const pct = (x: number) => `${Math.round(x * 100)} %`;
const score = (x: number) => `${Math.round(x * QUIZ_SIZE)}/${QUIZ_SIZE}`;

function status(c: ChapterProgress) {
  if (c.quizBest === null) return { label: "Chưa làm", variant: "outline" as const };
  return c.quizBest >= PASS_RATIO ? { label: "Đã đạt", variant: "secondary" as const } : { label: "Cần ôn thêm", variant: "destructive" as const };
}

function NoProgress() {
  return (
    <Empty className="border bg-white py-16">
      <EmptyHeader>
        <EmptyTitle>Chưa có lượt ôn tập nào</EmptyTitle>
        <EmptyDescription>
          Làm trắc nghiệm hoặc bài tập của một chương, kết quả sẽ hiện ở đây. Tiến độ lưu theo trình duyệt này, không cần đăng nhập.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/on-tap" />} nativeButton={false}>
          Bắt đầu ôn tập
          <ArrowRight data-icon="inline-end" />
        </Button>
      </EmptyContent>
    </Empty>
  );
}

async function SubjectProgress({ subject, visitorId }: { subject: Subject; visitorId: string }) {
  const numbers = subject.chapters.map((c) => c.number);
  const progress = await getProgress(visitorId, subject.id, numbers);
  const counts = quizCounts(subject.id, numbers);
  const rows = progress.chapters;
  const quizzes = rows.reduce((s, c) => s + c.quizAttempts, 0);
  const passed = rows.filter((c) => (c.quizBest ?? 0) >= PASS_RATIO).length;
  const exercises = rows.reduce((s, c) => s + c.exerciseAttempts, 0);
  const solved = rows.reduce((s, c) => s + c.exerciseSolved, 0);
  const asked = rows.reduce((s, c) => s + c.questions, 0);
  // Ưu tiên chương đã làm mà chưa đạt, sau đó tới chương chưa làm.
  const pending = subject.chapters.filter((c) => counts[c.number] && (rows.find((r) => r.chapter === c.number)?.quizBest ?? 0) < PASS_RATIO);
  const nextChapter = pending.find((c) => rows.find((r) => r.chapter === c.number)?.quizAttempts) ?? pending[0];

  if (quizzes + exercises + asked === 0) return <NoProgress />;

  const tiles = [
    { icon: Trophy, label: "Chương đã đạt", value: `${passed}/${Object.keys(counts).length}`, hint: `Đúng từ ${score(PASS_RATIO)} trở lên` },
    { icon: ListChecks, label: "Lượt trắc nghiệm", value: String(quizzes), hint: "Mỗi lượt 10 câu" },
    { icon: Calculator, label: "Bài tập làm đúng hết", value: `${solved}/${exercises}`, hint: "Bài tập tính toán" },
    { icon: MessageSquareText, label: "Câu đã hỏi trợ lý", value: String(asked), hint: "Có chọn chương" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <t.icon className="size-4 text-primary" />
                {t.label}
              </CardDescription>
              <span className="font-heading text-3xl font-bold tabular-nums">{t.value}</span>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {nextChapter && (
        <Card className="bg-primary-soft ring-primary/30">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardDescription>Nên ôn tiếp</CardDescription>
              <CardTitle>Chương {nextChapter.number}: {nextChapter.title}</CardTitle>
            </div>
            <Button render={<Link href={`/mon/${subject.id}/chuong/${nextChapter.number}/trac-nghiem`} />} nativeButton={false} className="shrink-0">
              Làm trắc nghiệm
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardHeader>
        </Card>
      )}

      <Card className="gap-0 py-0">
        {subject.chapters.map((chapter, i) => {
          const c = rows.find((r) => r.chapter === chapter.number)!;
          const s = status(c);
          const hasExercises = !!EXERCISES[subject.id]?.[chapter.number];
          return (
            <div key={chapter.number}>
              {i > 0 && <Separator />}
              <div className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-lg font-bold text-primary">{String(chapter.number).padStart(2, "0")}</span>
                    <Link href={`/mon/${subject.id}/chuong/${chapter.number}`} className="min-w-0 font-medium leading-snug hover:text-primary">
                      {chapter.title}
                    </Link>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <Progress value={(c.quizBest ?? 0) * 100} aria-label={`Điểm trắc nghiệm cao nhất chương ${chapter.number}`} />
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Trắc nghiệm:{" "}
                      {c.quizAttempts ? `cao nhất ${pct(c.quizBest!)}, gần nhất ${pct(c.quizLast!)}, ${c.quizAttempts} lượt` : "chưa làm"}
                    </span>
                    {hasExercises && <span>Bài tập: {c.exerciseAttempts ? `${c.exerciseSolved}/${c.exerciseAttempts} bài đúng hết` : "chưa làm"}</span>}
                    {c.questions > 0 && <span>Đã hỏi trợ lý {c.questions} câu</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {counts[chapter.number] && (
                    <Button size="sm" variant="outline" render={<Link href={`/mon/${subject.id}/chuong/${chapter.number}/trac-nghiem`} />} nativeButton={false}>
                      Trắc nghiệm
                    </Button>
                  )}
                  {hasExercises && (
                    <Button size="sm" variant="outline" render={<Link href={`/mon/${subject.id}/chuong/${chapter.number}/bai-tap`} />} nativeButton={false}>
                      Bài tập
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {progress.recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lượt làm gần đây</h2>
          <Card size="sm" className="gap-0 py-0">
            <CardContent className="px-0">
              {progress.recent.map((a, i) => (
                <div key={i}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span>
                      {a.kind === "quiz" ? "Trắc nghiệm" : "Bài tập"} chương {a.chapter}
                    </span>
                    <span className="flex items-center gap-4 text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">
                        {a.score}/{a.total}
                      </span>
                      <time dateTime={a.createdAt.toISOString()}>
                        {a.createdAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" })}
                      </time>
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

async function ProgressContent() {
  const visitorId = await getVisitorId();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:py-16">
      {ACTIVE_SUBJECTS.map((subject) => (
        <section key={subject.id} className="flex flex-col gap-6">
          {ACTIVE_SUBJECTS.length > 1 && <h2 className="text-2xl font-bold">{subject.name}</h2>}
          {visitorId ? (
            <SubjectProgress subject={subject} visitorId={visitorId} />
          ) : (
            <NoProgress />
          )}
        </section>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ôn tập", href: "/on-tap" }, { label: "Tiến độ" }]}
        title="Tiến độ ôn tập"
        lead="Kết quả trắc nghiệm, bài tập và số câu đã hỏi trợ lý theo từng chương. Tiến độ lưu theo trình duyệt này, không cần đăng nhập; xóa dữ liệu trình duyệt thì tiến độ bắt đầu lại."
      />
      <Suspense
        fallback={
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        }
      >
        <ProgressContent />
      </Suspense>
    </>
  );
}
