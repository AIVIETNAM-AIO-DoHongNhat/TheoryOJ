import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { AdminHeading, dateTime, score10 } from "@/features/admin/components/AdminHeading";
import { ResetPasswordButton } from "@/features/admin/components/ResetPasswordButton";
import { getStudent } from "@/features/admin/server/stats";
import { cardStatus } from "@/features/flashcards/schedule";
import { getDeck } from "@/features/flashcards/server/deck";
import { getStates } from "@/features/flashcards/server/states";
import { getProgress } from "@/features/progress/server/progress";
import { PASS_RATIO } from "@/features/quiz/types";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Học viên · Quản trị" };

type Params = Promise<{ ma: string }>;

async function Detail({ params }: { params: Params }) {
  const { ma } = await params;
  await requireTeacher(`/quan-tri/hoc-vien/${ma}`);
  const student = await getStudent(decodeURIComponent(ma).toUpperCase());
  if (!student) notFound();
  await connection();
  const now = new Date();

  const subjects = await Promise.all(
    ACTIVE_SUBJECTS.map(async (subject) => {
      const numbers = subject.chapters.map((c) => c.number);
      const [progress, states] = await Promise.all([getProgress(student.visitorId, subject.id, numbers), getStates(student.visitorId, subject.id)]);
      return { subject, progress, states };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminHeading
        title={student.fullName}
        description={`Mã học viên ${student.studentCode} · Lớp ${student.className} · Đăng ký ${dateTime(student.createdAt)} · Đăng nhập gần nhất ${dateTime(student.lastLoginAt)}`}
        actions={
          <>
            <Button variant="ghost" render={<Link href="/quan-tri/hoc-vien" />} nativeButton={false}>
              <ArrowLeft data-icon="inline-start" />
              Danh sách
            </Button>
            <ResetPasswordButton userId={student.id} fullName={student.fullName} />
          </>
        }
      />

      {subjects.map(({ subject, progress, states }) => (
        <Card key={subject.id}>
          <CardHeader>
            <CardTitle>{subject.name}</CardTitle>
            <CardDescription>Điểm trắc nghiệm quy về thang 10. Thẻ đã thuộc là thẻ có khoảng ôn từ 21 ngày.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chương</TableHead>
                  <TableHead className="text-right">Lượt trắc nghiệm</TableHead>
                  <TableHead className="text-right">Cao nhất</TableHead>
                  <TableHead className="text-right">Gần nhất</TableHead>
                  <TableHead className="text-right">Bài tập đúng hết</TableHead>
                  <TableHead className="text-right">Thẻ đã thuộc</TableHead>
                  <TableHead className="text-right">Câu hỏi trợ lý</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subject.chapters.map((c) => {
                  const p = progress.chapters.find((r) => r.chapter === c.number)!;
                  const ids = getDeck(subject.id, c.number)?.cards.map((x) => x.id) ?? [];
                  const st = ids.map((id) => cardStatus(states.get(id), now));
                  const mastered = st.filter((x) => x === "da-thuoc").length;
                  const due = st.filter((x) => x === "den-han").length;
                  return (
                    <TableRow key={c.number}>
                      <TableCell className="min-w-56 max-w-72 whitespace-normal">
                        <span className="mr-2 font-heading font-bold text-primary">{String(c.number).padStart(2, "0")}</span>
                        {c.title}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.quizAttempts || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.quizBest === null ? "—" : (
                          <Badge variant={p.quizBest >= PASS_RATIO ? "secondary" : "destructive"}>{score10(p.quizBest)}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{score10(p.quizLast)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {EXERCISES[subject.id]?.[c.number] ? `${p.exerciseSolved}/${p.exerciseAttempts}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {ids.length ? `${mastered}/${ids.length}${due ? ` (${due} đến hạn)` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.questions || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Câu hỏi gần đây gửi trợ lý</CardTitle>
          <CardDescription>15 câu mới nhất, giúp giảng viên thấy học viên đang vướng nội dung nào.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          {student.recentQuestions.length === 0 && <p className="text-sm text-muted-foreground">Chưa hỏi trợ lý câu nào.</p>}
          {student.recentQuestions.map((q, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-3" />}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <p className="text-sm">{q.text}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {getSubject(q.subject)?.shortName} · {dateTime(q.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Detail params={params} />
    </Suspense>
  );
}
