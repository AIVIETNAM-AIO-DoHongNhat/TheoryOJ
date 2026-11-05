import { ArrowLeft, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { EXERCISES } from "@/domain/ktct/exercises";
import { dateTime, score10, timeAgo, TONE_TEXT, toneOf } from "@/features/admin/components/AdminHeading";
import { ChapterNo, Dash, Initials, Panel, PanelHeader, TH } from "@/features/admin/components/AdminUi";
import { ResetPasswordButton } from "@/features/admin/components/ResetPasswordButton";
import { getStudent } from "@/features/admin/server/stats";
import { cardStatus } from "@/features/flashcards/schedule";
import { getDeck } from "@/features/flashcards/server/deck";
import { getStates } from "@/features/flashcards/server/states";
import { getProgress } from "@/features/progress/server/progress";
import { PASS_RATIO } from "@/features/quiz/types";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

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
      const rows = subject.chapters.map((c) => {
        const p = progress.chapters.find((r) => r.chapter === c.number)!;
        const ids = getDeck(subject.id, c.number)?.cards.map((x) => x.id) ?? [];
        const st = ids.map((id) => cardStatus(states.get(id), now));
        return { c, p, cards: ids.length, mastered: st.filter((x) => x === "da-thuoc").length, due: st.filter((x) => x === "den-han").length };
      });
      const bests = rows.map((r) => r.p.quizBest).filter((x): x is number => x !== null);
      const summary = [
        { label: "Chương đạt", value: `${bests.filter((b) => b >= PASS_RATIO).length}/${rows.length}` },
        { label: "Điểm TB cao nhất", value: bests.length ? score10(bests.reduce((a, b) => a + b, 0) / bests.length) : "—", tone: toneOf(bests.length ? bests.reduce((a, b) => a + b, 0) / bests.length : null) },
        { label: "Thẻ đã thuộc", value: `${rows.reduce((n, r) => n + r.mastered, 0)}/${rows.reduce((n, r) => n + r.cards, 0)}` },
        { label: "Câu hỏi trợ lý", value: rows.reduce((n, r) => n + r.p.questions, 0) },
      ];
      return { subject, rows, summary };
    }),
  );

  const meta = [
    { label: "Mã học viên", value: <span className="font-mono">{student.studentCode}</span> },
    { label: "Lớp", value: student.className },
    { label: "Đăng ký", value: dateTime(student.createdAt) },
    { label: "Đăng nhập gần nhất", value: student.lastLoginAt ? <span title={dateTime(student.lastLoginAt)}>{timeAgo(student.lastLoginAt, now)}</span> : "Chưa đăng nhập" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" render={<Link href="/quan-tri/hoc-vien" />} nativeButton={false}>
        <ArrowLeft data-icon="inline-start" />
        Danh sách học viên
      </Button>

      <Panel className="relative">
        <div className="mesh-dark absolute inset-x-0 top-0 h-20 overflow-hidden" aria-hidden>
          <div className="grid-lines absolute inset-0 bg-size-[28px_28px] [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)]" />
        </div>
        <div className="relative flex flex-col gap-4 px-5 pt-10 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex items-start gap-4">
            <Initials name={student.fullName} className="size-20 bg-card bg-none text-2xl ring-4 ring-card shadow-md" />
            <div className="flex min-w-0 flex-col pt-11">
              <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">{student.fullName}</h1>
              <span className="text-sm text-muted-foreground">Học viên lớp {student.className}</span>
            </div>
          </div>
          <ResetPasswordButton userId={student.id} fullName={student.fullName} />
        </div>
        <dl className="grid grid-cols-2 border-t sm:grid-cols-4 sm:divide-x">
          {meta.map((m) => (
            <div key={m.label} className="flex flex-col gap-0.5 px-5 py-3 sm:px-6">
              <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
              <dd className="text-sm font-medium">{m.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {subjects.map(({ subject, rows, summary }) => (
        <Panel key={subject.id}>
          <PanelHeader title={subject.name} description="Điểm trắc nghiệm thang 10. Thẻ đã thuộc là thẻ có khoảng ôn từ 21 ngày." />
          <dl className="grid grid-cols-2 border-b sm:grid-cols-4 sm:divide-x">
            {summary.map((it) => (
              <div key={it.label} className="flex flex-col gap-0.5 px-5 py-3">
                <dt className="text-[11px] text-muted-foreground">{it.label}</dt>
                <dd className={cn("font-heading text-lg font-semibold tabular-nums", it.tone && TONE_TEXT[it.tone])}>{it.value}</dd>
              </div>
            ))}
          </dl>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(TH, "pl-5")}>Chương</TableHead>
                <TableHead className={cn(TH, "text-right")}>Lượt làm</TableHead>
                <TableHead className={cn(TH, "text-right")}>Cao nhất</TableHead>
                <TableHead className={cn(TH, "text-right")}>Gần nhất</TableHead>
                <TableHead className={cn(TH, "text-right")}>Bài tập đúng hết</TableHead>
                <TableHead className={cn(TH, "text-right")}>Thẻ thuộc</TableHead>
                <TableHead className={cn(TH, "pr-5 text-right")}>Câu hỏi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ c, p, cards, mastered, due }) => (
                <TableRow key={c.number}>
                  <TableCell className="min-w-64 max-w-80 py-3 pl-5 whitespace-normal">
                    <div className="flex items-start gap-3">
                      <ChapterNo n={c.number} />
                      <span className="leading-snug">{c.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.quizAttempts || <Dash />}</TableCell>
                  <TableCell className="text-right">
                    {p.quizBest === null ? (
                      <Dash />
                    ) : (
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-10 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums",
                          p.quizBest >= PASS_RATIO ? "bg-primary-soft text-primary ring-1 ring-primary/15" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {score10(p.quizBest)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.quizLast === null ? <Dash /> : score10(p.quizLast)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {EXERCISES[subject.id]?.[c.number] ? (
                      <>
                        <span className="font-medium">{p.exerciseSolved}</span>
                        <span className="text-muted-foreground">/{p.exerciseAttempts}</span>
                      </>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {cards ? (
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span>
                          <span className="font-medium">{mastered}</span>
                          <span className="text-muted-foreground">/{cards}</span>
                        </span>
                        {due > 0 && (
                          <span className="rounded-full bg-warn-soft px-1.5 py-px text-[10.5px] font-medium text-warn" title={`${due} thẻ đến hạn ôn`}>
                            {due} đến hạn
                          </span>
                        )}
                      </span>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">{p.questions || <Dash />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ))}

      <Panel>
        <PanelHeader title="Câu hỏi gần đây gửi trợ lý" description="15 câu mới nhất, cho thấy học viên đang vướng nội dung nào." />
        {student.recentQuestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground">
            <MessageSquareText className="size-5 text-muted-foreground/60" />
            Chưa hỏi trợ lý câu nào.
          </div>
        ) : (
          <ol className="relative flex flex-col px-5 py-4">
            {student.recentQuestions.map((q, i) => (
              <li key={i} className="relative flex gap-4 pb-4 last:pb-0">
                {/* Đường nối các mốc thời gian. */}
                {i < student.recentQuestions.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-border" aria-hidden />}
                <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary/50 bg-card" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <p className="text-sm leading-relaxed">{q.text}</p>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-md border bg-background px-1.5 py-px font-medium">{getSubject(q.subject)?.shortName}</span>
                    <span title={dateTime(q.createdAt)}>{timeAgo(q.createdAt, now)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

export default function StudentPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}
