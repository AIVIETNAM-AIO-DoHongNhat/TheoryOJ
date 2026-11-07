import {
  ArrowRight, BookOpen, CircleCheckBig, ClipboardList, Flame, GalleryVerticalEnd, ListChecks, MessageSquareText, Plus, Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ComponentType, ReactNode } from "react";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { BadgeSummary } from "@/features/badges/components/BadgeSummary";
import { listStudentExams } from "@/features/exams/server/exams";
import { formatVnTime } from "@/features/exams/time";
import { syncBadges } from "@/features/badges/server/badges";
import { printedPage } from "@/features/library/types";
import { getToday, type SubjectToday } from "@/features/progress/server/today";
import { reviewHref } from "@/features/review/paths";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hôm nay" };

interface Task {
  key: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: ReactNode;
  href: string;
  cta: string;
  primary?: boolean;
}

/** Việc nên làm hôm nay của một môn: thẻ đến hạn trước (quên nhanh nhất), rồi trắc nghiệm, rồi thẻ mới. */
function tasksOf(s: SubjectToday, prefix: string): Task[] {
  const id = s.subject.id;
  const tasks: Task[] = [];
  const dueTotal = s.due.reduce((a, d) => a + d.count, 0);
  if (dueTotal) {
    const [top, ...rest] = s.due;
    tasks.push({
      key: `${s.subject.id}-due`,
      icon: GalleryVerticalEnd,
      title: `${prefix}Ôn ${dueTotal} thẻ ghi nhớ đến hạn`,
      description: (
        <>
          Chương {top.chapter}: {top.title} ({top.count} thẻ)
          {rest.length > 0 && <>, và {rest.map((d) => `chương ${d.chapter}`).join(", ")}</>}. Ôn đúng hẹn giúp nhớ lâu hơn.
        </>
      ),
      href: reviewHref(id, top.chapter, "the-ghi-nho"),
      cta: "Ôn ngay",
      primary: true,
    });
  }
  if (s.nextQuiz) {
    tasks.push({
      key: `${s.subject.id}-quiz`,
      icon: ListChecks,
      title: `${prefix}Trắc nghiệm chương ${s.nextQuiz.chapter}`,
      description: `${s.nextQuiz.title}. ${s.nextQuiz.attempted ? "Lần trước chưa đạt, làm lại để củng cố." : "Đồng chí chưa làm chương này."}`,
      href: reviewHref(id, s.nextQuiz.chapter, "trac-nghiem"),
      cta: s.nextQuiz.attempted ? "Làm lại" : "Bắt đầu",
      primary: !dueTotal,
    });
  }
  if (s.newCards && !dueTotal) {
    tasks.push({
      key: `${s.subject.id}-new`,
      icon: Sparkles,
      title: `${prefix}Học ${s.newCards.count} thẻ mới chương ${s.newCards.chapter}`,
      description: `${s.newCards.title}. Mỗi lượt tối đa 20 thẻ mới, hệ thống tự hẹn ngày ôn lại.`,
      href: reviewHref(id, s.newCards.chapter, "the-ghi-nho"),
      cta: "Học thẻ",
    });
  }
  return tasks;
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <task.icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium leading-snug">{task.title}</span>
        <span className="text-sm text-muted-foreground">{task.description}</span>
      </div>
      <Button variant={task.primary ? "default" : "outline"} className="shrink-0" render={<Link href={task.href} />} nativeButton={false}>
        {task.cta}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}

function Stat({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-heading text-lg font-bold tabular-nums">
          {value}/{max}
        </span>
      </div>
      <Progress value={max ? (value / max) * 100 : 0} aria-label={label} />
    </div>
  );
}

const timeAgo = (d: Date) => {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days === 0 ? "Hôm nay" : days === 1 ? "Hôm qua" : `${days} ngày trước`;
};

async function TodayContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?tiep=/hoc");
  if (user.role === "giang-vien") redirect("/quan-tri");
  await connection();
  const [today, badges, exams] = await Promise.all([getToday(user.visitorId), syncBadges(user.visitorId), listStudentExams(user)]);
  // Đề đang mở mà học viên còn lượt làm, hoặc đang làm dở.
  const openExams = exams.filter((e) => e.phase === "dang-mo" && (e.inProgress || e.attemptsUsed < e.maxAttempts));
  const many = ACTIVE_SUBJECTS.length > 1;
  const tasks = today.subjects.flatMap((s) => tasksOf(s, many ? `${s.subject.shortName}: ` : ""));
  const name = user.fullName.trim().split(/\s+/).at(-1);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Hôm nay" }]}
        title={`Chào đồng chí ${name}`}
        lead={
          tasks.length
            ? `Hôm nay có ${tasks.length} việc nên làm. Mỗi ngày dành khoảng 15 phút ôn thẻ và một đề trắc nghiệm là đủ để giữ nhịp.`
            : "Đồng chí đã xong việc ôn tập hôm nay. Có thể đọc thêm giáo trình hoặc hỏi trợ lý về phần còn băn khoăn."
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant={today.streak ? "default" : "outline"} className={today.streak ? undefined : "bg-card"}>
            <Flame data-icon="inline-start" />
            {today.streak ? `${today.streak} ngày học liên tiếp` : "Bắt đầu chuỗi ngày học"}
          </Badge>
          {today.streak > 0 && !today.studiedToday && (
            <Badge variant="outline" className="bg-card">Học một chút hôm nay để giữ chuỗi</Badge>
          )}
          <Badge variant="outline" className="bg-card">{user.studentCode} · Lớp {user.className}</Badge>
        </div>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col gap-4">
          {openExams.length > 0 && (
            <Card size="sm" className="bg-warn-soft ring-warn/40">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5 text-warn">
                  <ClipboardList className="size-4" />
                  Đề thi đang mở
                </CardDescription>
                <CardTitle className="leading-snug">
                  {openExams.length === 1 ? openExams[0].title : `${openExams.length} đề thi đang chờ đồng chí làm`}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {openExams.some((e) => e.inProgress)
                    ? "Có bài đang làm dở, đồng hồ vẫn đang chạy."
                    : openExams[0].closesAt
                      ? `Hạn gần nhất: ${formatVnTime(openExams.map((e) => e.closesAt).filter(Boolean).sort()[0] ?? null)}`
                      : "Đề không có hạn nộp."}
                </span>
                <Button size="sm" render={<Link href={openExams.length === 1 ? `/de-thi/${openExams[0].id}` : "/de-thi"} />} nativeButton={false}>
                  {openExams.some((e) => e.inProgress) ? "Làm tiếp" : "Vào làm bài"}
                </Button>
              </CardContent>
            </Card>
          )}
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Việc hôm nay</h2>
          {tasks.length ? (
            <Card className="gap-0 py-0">
              {tasks.map((t, i) => (
                <div key={t.key}>
                  {i > 0 && <Separator />}
                  <TaskRow task={t} />
                </div>
              ))}
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <CircleCheckBig className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <CardTitle>Đã xong việc hôm nay</CardTitle>
                  <CardDescription>Không còn thẻ đến hạn và mọi chương đều đã đạt trắc nghiệm.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          {today.reading && (
            <Card size="sm" className="bg-primary-soft ring-primary/30">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5">
                  <BookOpen className="size-4 text-primary" />
                  Đọc tiếp
                </CardDescription>
                <CardTitle className="leading-snug">{today.reading.doc.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const { doc, page } = today.reading;
                    const chapter = doc.chapters.find((c) => page >= c.from && page <= c.to);
                    const printed = printedPage(doc, page);
                    return `${printed > 0 ? `Trang in ${printed}` : `Trang ${page}`}${chapter ? `, chương ${chapter.number}` : ""} · ${timeAgo(today.reading.updatedAt).toLowerCase()}`;
                  })()}
                </p>
                <Button size="sm" className="self-start" render={<Link href={`/thu-vien/${today.reading.doc.slug}?trang=${today.reading.page}`} />} nativeButton={false}>
                  Đọc tiếp
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardContent>
            </Card>
          )}

          <BadgeSummary collection={badges} />

          {today.subjects.map((s) => (
            <Card key={s.subject.id} size="sm">
              <CardHeader>
                <CardTitle>{many ? s.subject.name : "Tiến độ"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Stat label="Chương đã đạt trắc nghiệm" value={s.passed} max={s.quizChapters} />
                {s.cardTotal > 0 && <Stat label="Thẻ đã thuộc" value={s.mastered} max={s.cardTotal} />}
                <Link href="/tien-do" className="text-sm font-medium text-primary hover:underline">
                  Xem tiến độ chi tiết →
                </Link>
              </CardContent>
            </Card>
          ))}

          <Card size="sm">
            <CardHeader>
              <CardTitle>Hỏi trợ lý gần đây</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {today.conversations.length ? (
                today.conversations.map((c) => (
                  <Link key={c.id} href={`/tro-ly/${c.id}`} className="-mx-2 flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-muted">
                    <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.updatedAt)}</span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có câu hỏi nào. Trợ lý trả lời từ giáo trình, có trích trang.</p>
              )}
              <Button variant="outline" size="sm" className="mt-2 self-start" render={<Link href="/tro-ly" />} nativeButton={false}>
                <Plus data-icon="inline-start" />
                Hỏi câu mới
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TodayContent />
    </Suspense>
  );
}
