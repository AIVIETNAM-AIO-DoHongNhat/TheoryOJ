import { ArrowRight, CalendarClock, ClipboardList, Clock, ListChecks, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getSubject } from "@/config/subjects";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { PhaseBadge } from "@/features/exams/components/PhaseBadge";
import { durationText, EXAM_PASS_RATIO, score10 } from "@/features/exams/logic";
import { listStudentExams } from "@/features/exams/server/exams";
import { formatVnTime } from "@/features/exams/time";
import type { StudentExamItem } from "@/features/exams/types";
import { getCurrentUser, isStudent } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Đề thi",
  description: "Đề kiểm tra giảng viên giao cho lớp, có thời gian làm bài và hạn nộp.",
};

function ExamCard({ exam }: { exam: StudentExamItem }) {
  const left = exam.maxAttempts - exam.attemptsUsed;
  const cta = exam.inProgress ? "Làm tiếp" : exam.phase === "dang-mo" && left > 0 ? (exam.attemptsUsed ? "Làm lại" : "Vào làm bài") : "Xem chi tiết";
  const ratio = exam.best ? exam.best.score / exam.best.total : null;
  return (
    <Card className={cn(exam.inProgress && "ring-warn/50", exam.phase === "dang-mo" && !exam.inProgress && left > 0 && "ring-primary/40")}>
      <CardHeader>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={exam.phase} />
          {exam.inProgress && <Badge variant="outline" className="border-warn/40 bg-warn-soft text-warn">Đang làm dở</Badge>}
          <span>{getSubject(exam.subject)?.shortName}</span>
        </CardDescription>
        <CardTitle className="text-lg leading-snug">{exam.title}</CardTitle>
        {exam.description && <p className="line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ListChecks className="size-4" /> {exam.questionCount} câu
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4" /> {durationText(exam.durationMin)}
        </span>
        <span className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="size-4" />
          {exam.phase === "sap-mo" ? `Mở lúc ${formatVnTime(exam.opensAt)}` : exam.closesAt ? `Hạn ${formatVnTime(exam.closesAt)}` : "Không có hạn nộp"}
        </span>
        {exam.best && (
          <span className="col-span-2 flex items-center gap-1.5">
            <Trophy className="size-4 text-muted-foreground" />
            Điểm cao nhất{" "}
            <b className={cn("font-heading text-base", ratio! >= EXAM_PASS_RATIO ? "text-primary" : "text-destructive")}>
              {score10(exam.best.score, exam.best.total)}
            </b>
            <span className="text-muted-foreground">({exam.best.score}/{exam.best.total} câu)</span>
          </span>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Đã làm {exam.attemptsUsed}/{exam.maxAttempts} lượt
        </span>
        <Button
          variant={cta === "Xem chi tiết" ? "outline" : "default"}
          render={<Link href={`/de-thi/${exam.id}`} />}
          nativeButton={false}
        >
          {cta}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}

async function ExamList() {
  const user = await getCurrentUser();
  if (!isStudent(user)) return <StudentGate user={user} next="/de-thi" action="làm đề thi" className="mx-auto max-w-3xl" />;
  const exams = await listStudentExams(user);

  if (exams.length === 0) {
    return (
      <Empty className="mx-auto max-w-3xl border border-solid bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList />
          </EmptyMedia>
          <EmptyTitle>Chưa có đề thi nào</EmptyTitle>
          <EmptyDescription>Khi giảng viên giao đề cho lớp {user.className}, đề sẽ hiện ở đây. Trong lúc chờ, đồng chí ôn trắc nghiệm theo chương ở mục Ôn tập.</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" render={<Link href="/on-tap" />} nativeButton={false}>
          Vào ôn tập
        </Button>
      </Empty>
    );
  }

  const groups = [
    { title: "Đang mở", items: exams.filter((e) => e.phase === "dang-mo") },
    { title: "Sắp mở", items: exams.filter((e) => e.phase === "sap-mo") },
    { title: "Đã đóng", items: exams.filter((e) => e.phase === "da-dong") },
  ].filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">
            {g.title} <span className="text-base font-normal text-muted-foreground">({g.items.length})</span>
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {g.items.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ExamsPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Đề thi" }]}
        title="Đề thi"
        lead="Đề kiểm tra giảng viên giao cho lớp. Mỗi đề có thời gian làm bài; đáp án được lưu dần trong lúc làm, hết giờ máy chủ tự nộp phần đã chọn."
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <Suspense fallback={<PageSkeleton />}>
          <ExamList />
        </Suspense>
      </div>
    </>
  );
}
