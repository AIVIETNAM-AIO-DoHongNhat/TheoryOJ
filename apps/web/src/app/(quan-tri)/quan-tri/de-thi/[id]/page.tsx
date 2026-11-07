import { Award, CalendarClock, ListChecks, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getSubject } from "@/config/subjects";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { Panel, PanelHeader, StatTile } from "@/features/admin/components/AdminUi";
import { ExamAdminActions } from "@/features/exams/components/ExamAdminActions";
import { PhaseBadge } from "@/features/exams/components/PhaseBadge";
import { StudentResults } from "@/features/exams/components/StudentResults";
import { durationText, EXAM_PASS_RATIO, REVEAL_LABELS, score10 } from "@/features/exams/logic";
import { getExamResults } from "@/features/exams/server/exams";
import { formatVnTime } from "@/features/exams/time";
import { LETTERS } from "@/features/question-bank/schema";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kết quả đề thi · Quản trị" };

async function Results({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTeacher(`/quan-tri/de-thi/${id}`);
  const data = /^\d+$/.test(id) ? await getExamResults(Number(id)) : null;
  if (!data) notFound();
  const { exam, phase, students, questions } = data;

  const done = students.filter((s) => s.best);
  const ratios = done.map((s) => s.best!.score / s.best!.total);
  const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
  const passed = ratios.filter((r) => r >= EXAM_PASS_RATIO).length;
  // Phổ điểm theo khoảng 1 điểm: 0–<1, …, 9–10.
  const bins = Array.from({ length: 10 }, (_, i) => ratios.filter((r) => Math.min(9, Math.floor(r * 10)) === i).length);
  const maxBin = Math.max(1, ...bins);
  const asRatio = (r: number | null) => (r === null ? "—" : score10(Math.round(r * 1000), 1000));

  return (
    <div className="flex flex-col gap-6">
      <AdminHeading
        overline={`Đề thi · ${getSubject(exam.subject)?.shortName ?? exam.subject}`}
        title={exam.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <PhaseBadge phase={phase} />
            <span>{questions.length} câu · {durationText(exam.durationMin)} · {exam.maxAttempts} lượt</span>
            <span>· {exam.classes.length ? `Lớp ${exam.classes.join(", ")}` : "Mọi lớp"}</span>
            <span>· {REVEAL_LABELS[exam.reveal].label}</span>
          </span>
        }
        actions={<ExamAdminActions id={exam.id} phase={phase} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Đã nộp" value={`${done.length}/${students.length}`} hint={`${students.filter((s) => s.inProgress).length} học viên đang làm`} accent />
        <StatTile icon={ListChecks} label="Điểm trung bình" value={asRatio(avg)} hint="Lượt cao nhất của mỗi học viên, thang 10" />
        <StatTile
          icon={Award}
          label="Đạt từ 5 điểm"
          value={done.length ? `${Math.round((passed / done.length) * 100)}%` : "—"}
          hint={done.length ? `${passed} học viên · cao nhất ${asRatio(Math.max(...ratios))}, thấp nhất ${asRatio(Math.min(...ratios))}` : "Chưa có bài nộp"}
        />
        <StatTile
          icon={CalendarClock}
          label="Thời hạn"
          value={<span className="text-xl">{exam.closesAt ? formatVnTime(exam.closesAt) : "Không hạn"}</span>}
          hint={exam.opensAt ? `Mở từ ${formatVnTime(exam.opensAt)}` : "Mở ngay khi giao"}
        />
      </div>

      {done.length > 0 && (
        <Panel>
          <PanelHeader title="Phổ điểm" description="Số học viên theo khoảng điểm của lượt cao nhất." />
          <div className="flex h-44 items-end gap-2 px-5 pt-6 pb-4">
            {bins.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{n || ""}</span>
                <div
                  className={cn("w-full rounded-t-md", i >= 5 ? "bg-primary" : "bg-destructive/70", n === 0 && "bg-muted")}
                  style={{ height: `${Math.max(4, (n / maxBin) * 100)}px` }}
                  title={`${i}–${i + 1} điểm: ${n} học viên`}
                />
                <span className="text-[11px] tabular-nums text-muted-foreground">{i}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Học viên" description="Học viên thuộc lớp được giao, kể cả chưa làm. Bài hết giờ mà chưa nộp được máy chủ tự chấm theo phần đã lưu." />
        <StudentResults examId={exam.id} title={exam.title} students={students} />
      </Panel>

      <Panel>
        <PanelHeader
          title="Phân tích từng câu"
          description="Tính trên lượt nộp đầu tiên của mỗi học viên. Câu có tỷ lệ đúng thấp hoặc một phương án sai được chọn nhiều nên xem lại cách hỏi hoặc giảng lại."
        />
        <ol className="divide-y">
          {questions.map((q, i) => {
            const rate = q.answered ? q.correct / q.answered : null;
            return (
              <li key={q.key} className="flex flex-col gap-2 px-5 py-4 lg:flex-row lg:gap-6">
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="mt-0.5 inline-flex h-6 min-w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft px-1 font-mono text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      Chương {q.chapter} · <span className="font-mono">{q.code}</span>
                    </span>
                    <p className="text-sm font-medium leading-snug">{q.q}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 lg:w-80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{q.answered ? `${q.answered} bài · ${q.blank} bỏ trống` : "Chưa có bài nộp"}</span>
                    <b className={cn("tabular-nums", rate === null ? "text-muted-foreground" : rate >= 0.7 ? "text-primary" : rate >= 0.4 ? "text-warn" : "text-destructive")}>
                      {rate === null ? "—" : `${Math.round(rate * 100)}% đúng`}
                    </b>
                  </div>
                  {q.options.map((o, j) => {
                    const share = q.answered ? q.picks[j] / q.answered : 0;
                    return (
                      <div key={j} className="flex items-center gap-2 text-[12px]" title={o}>
                        <span className={cn("w-4 font-semibold", j === q.answer ? "text-primary" : "text-muted-foreground")}>{LETTERS[j]}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", j === q.answer ? "bg-primary" : "bg-destructive/60")} style={{ width: `${share * 100}%` }} />
                        </div>
                        <span className="w-14 truncate text-muted-foreground">{o}</span>
                        <span className="w-8 text-right tabular-nums">{q.picks[j]}</span>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
      <Results params={params} />
    </Suspense>
  );
}
