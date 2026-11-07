import { ArrowRight, Calculator, GalleryVerticalEnd, ListChecks, MessageSquareText, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
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
import { StudentGate } from "@/features/auth/components/StudentGate";
import { cardStatus } from "@/features/flashcards/schedule";
import { getDeck } from "@/features/flashcards/server/deck";
import { getStates } from "@/features/flashcards/server/states";
import { userCardIds } from "@/features/flashcards/server/user-cards";
import { noteCounts } from "@/features/notes/server/notes";
import { openAnswerSummary } from "@/features/open-answer/server/attempts";
import { essayCounts } from "@/features/open-answer/server/bank";
import { type ChapterProgress, getProgress } from "@/features/progress/server/progress";
import { pickNextChapter } from "@/features/progress/today";
import { reviewHref } from "@/features/review/paths";
import { quizCounts } from "@/features/quiz/server/bank";
import { PASS_RATIO, QUIZ_SIZE } from "@/features/quiz/types";
import { getCurrentUser, isStudent } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tiến độ ôn tập" };

const pct = (x: number) => `${Math.round(x * 100)} %`;
const score = (x: number) => `${Math.round(x * QUIZ_SIZE)}/${QUIZ_SIZE}`;

function status(c: ChapterProgress) {
  if (c.quizBest === null) return { label: "Chưa làm", variant: "outline" as const };
  return c.quizBest >= PASS_RATIO ? { label: "Đã đạt", variant: "secondary" as const } : { label: "Cần ôn thêm", variant: "destructive" as const };
}

function NoProgress() {
  return (
    <Empty className="border bg-card py-16">
      <EmptyHeader>
        <EmptyTitle>Chưa có lượt ôn tập nào</EmptyTitle>
        <EmptyDescription>
          Làm trắc nghiệm, bài tập hoặc ôn thẻ ghi nhớ của một chương, kết quả sẽ hiện ở đây.
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
  const [progress, cardStates, ownCards, notes, openAnswers] = await Promise.all([
    getProgress(visitorId, subject.id, numbers),
    getStates(visitorId, subject.id),
    userCardIds(visitorId, subject.id),
    noteCounts(visitorId, subject.id),
    openAnswerSummary(visitorId, subject.id),
  ]);
  const essays = essayCounts(subject.id, numbers);
  const openOf = (n: number, kind: "tu_luan" | "phan_bac") => openAnswers.find((o) => o.chapter === n && o.kind === kind);
  const fmt10 = (x: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  // Trạng thái thẻ (đến hạn, đã thuộc) tính theo thời điểm mở trang.
  await connection();
  const now = new Date();
  const cards = Object.fromEntries(
    numbers.map((n) => {
      // Thẻ trong content/ cùng thẻ học viên tự tạo.
      const ids = [...(getDeck(subject.id, n)?.cards.map((c) => c.id) ?? []), ...ownCards.filter((c) => c.chapter === n).map((c) => c.id)];
      const st = ids.map((id) => cardStatus(cardStates.get(id), now));
      return [n, { total: ids.length, mastered: st.filter((x) => x === "da-thuoc").length, due: st.filter((x) => x === "den-han").length, seen: st.filter((x) => x !== "moi").length }];
    }),
  );
  const cardTotal = Object.values(cards).reduce((a, c) => a + c.total, 0);
  const noteTotal = Object.values(notes).reduce((a, b) => a + b, 0);
  const mastered = Object.values(cards).reduce((a, c) => a + c.mastered, 0);
  const dueCards = Object.values(cards).reduce((a, c) => a + c.due, 0);
  const counts = await quizCounts(subject.id, numbers);
  const rows = progress.chapters;
  const quizzes = rows.reduce((s, c) => s + c.quizAttempts, 0);
  const passed = rows.filter((c) => (c.quizBest ?? 0) >= PASS_RATIO).length;
  const exercises = rows.reduce((s, c) => s + c.exerciseAttempts, 0);
  const solved = rows.reduce((s, c) => s + c.exerciseSolved, 0);
  const asked = rows.reduce((s, c) => s + c.questions, 0);
  const nextChapter = pickNextChapter(subject.chapters, rows, counts);

  if (quizzes + exercises + asked + cardStates.size + noteTotal + openAnswers.length === 0) return <NoProgress />;

  const tiles = [
    { icon: Trophy, label: "Chương đã đạt", value: `${passed}/${Object.keys(counts).length}`, hint: `Đúng từ ${score(PASS_RATIO)} trở lên` },
    { icon: ListChecks, label: "Lượt trắc nghiệm", value: String(quizzes), hint: "Mỗi lượt 10 câu" },
    { icon: Calculator, label: "Bài tập làm đúng hết", value: `${solved}/${exercises}`, hint: "Bài tập tính toán" },
    { icon: MessageSquareText, label: "Câu đã hỏi trợ lý", value: String(asked), hint: "Có chọn chương" },
  ];
  if (cardTotal) {
    tiles.splice(1, 0, {
      icon: GalleryVerticalEnd,
      label: "Thẻ đã thuộc",
      value: `${mastered}/${cardTotal}`,
      hint: dueCards ? `${dueCards} thẻ đến hạn ôn hôm nay` : "Không có thẻ đến hạn",
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className={cn("grid gap-4 sm:grid-cols-2", tiles.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
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
            <Button render={<Link href={reviewHref(subject.id, nextChapter.number, "trac-nghiem")} />} nativeButton={false} className="shrink-0">
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
                    <Link href={reviewHref(subject.id, chapter.number)} className="min-w-0 font-medium leading-snug hover:text-primary">
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
                    {cards[chapter.number].total > 0 && (
                      <span>
                        Thẻ ghi nhớ:{" "}
                        {cards[chapter.number].seen
                          ? `đã thuộc ${cards[chapter.number].mastered}/${cards[chapter.number].total}${cards[chapter.number].due ? `, ${cards[chapter.number].due} thẻ đến hạn` : ""}`
                          : "chưa ôn"}
                      </span>
                    )}
                    {essays[chapter.number] && (
                      <span>
                        Tự luận:{" "}
                        {openOf(chapter.number, "tu_luan")
                          ? `cao nhất ${fmt10(openOf(chapter.number, "tu_luan")!.best)}/10, ${openOf(chapter.number, "tu_luan")!.items}/${essays[chapter.number]} câu`
                          : "chưa làm"}
                      </span>
                    )}
                    {openOf(chapter.number, "phan_bac") && (
                      <span>
                        Phản bác: cao nhất {fmt10(openOf(chapter.number, "phan_bac")!.best)}/10, {openOf(chapter.number, "phan_bac")!.items} luận điệu
                      </span>
                    )}
                    {c.questions > 0 && <span>Đã hỏi trợ lý {c.questions} câu</span>}
                    {notes[chapter.number] > 0 && (
                      <Link href={`/mon/${subject.id}/chuong/${chapter.number}`} className="hover:text-primary hover:underline">
                        {notes[chapter.number]} ghi chú
                      </Link>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cards[chapter.number].total > 0 && (
                    <Button
                      size="sm"
                      variant={cards[chapter.number].due ? "default" : "outline"}
                      render={<Link href={reviewHref(subject.id, chapter.number, "the-ghi-nho")} />}
                      nativeButton={false}
                    >
                      Thẻ ghi nhớ{cards[chapter.number].due ? ` (${cards[chapter.number].due})` : ""}
                    </Button>
                  )}
                  {counts[chapter.number] && (
                    <Button size="sm" variant="outline" render={<Link href={reviewHref(subject.id, chapter.number, "trac-nghiem")} />} nativeButton={false}>
                      Trắc nghiệm
                    </Button>
                  )}
                  {hasExercises && (
                    <Button size="sm" variant="outline" render={<Link href={reviewHref(subject.id, chapter.number, "bai-tap")} />} nativeButton={false}>
                      Bài tập
                    </Button>
                  )}
                  {essays[chapter.number] && (
                    <Button size="sm" variant="outline" render={<Link href={reviewHref(subject.id, chapter.number, "tu-luan")} />} nativeButton={false}>
                      Tự luận
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
  const user = await getCurrentUser();
  if (!isStudent(user)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <StudentGate user={user} next="/tien-do" action="xem tiến độ" />
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:py-16">
      <p className="-mb-6 text-sm text-muted-foreground">
        Học viên <span className="font-medium text-foreground">{user.fullName}</span> · {user.studentCode} · Lớp {user.className}
      </p>
      {ACTIVE_SUBJECTS.map((subject) => (
        <section key={subject.id} className="flex flex-col gap-6">
          {ACTIVE_SUBJECTS.length > 1 && <h2 className="text-2xl font-bold">{subject.name}</h2>}
          <SubjectProgress subject={subject} visitorId={user.visitorId} />
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
        lead="Thẻ ghi nhớ, kết quả trắc nghiệm, bài tập và số câu đã hỏi trợ lý theo từng chương. Tiến độ lưu theo tài khoản học viên, học trên máy nào cũng thấy."
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
