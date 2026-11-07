import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeading, dateTime } from "@/features/admin/components/AdminHeading";
import { Panel, PanelHeader } from "@/features/admin/components/AdminUi";
import { LecturerScoreForm } from "@/features/admin/components/LecturerScoreForm";
import { getGraded } from "@/features/admin/server/grading";
import { GradeReport } from "@/features/open-answer/components/GradeReport";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Chấm bài · Quản trị" };

type Params = Promise<{ id: string }>;

async function Detail({ params }: { params: Params }) {
  const { id } = await params;
  await requireTeacher(`/quan-tri/cham-bai/${id}`);
  const item = Number.isInteger(Number(id)) ? await getGraded(Number(id)) : null;
  if (!item) notFound();

  return (
    <>
      <AdminHeading
        overline={`${item.kind === "phan_bac" ? "Phản bác" : "Tự luận"} · Chương ${item.chapter} · ${item.itemId}`}
        title={item.student ? `${item.student.name} (${item.student.code})` : "Bài làm"}
        description={`${item.student ? `Lớp ${item.student.className} · ` : ""}Nộp lúc ${dateTime(item.createdAt)}${item.model ? ` · Mô hình ${item.model}` : ""}${item.latencyMs ? ` · ${Math.round(item.latencyMs / 100) / 10} giây` : ""}`}
        actions={
          <Button variant="outline" className="bg-card" render={<Link href="/quan-tri/cham-bai" />} nativeButton={false}>
            <ArrowLeft data-icon="inline-start" />
            Danh sách bài
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title={item.kind === "phan_bac" ? "Luận điệu cần phản bác" : "Đề bài"} />
            <p className="px-5 py-4 text-[15px] font-medium leading-relaxed">{item.prompt}</p>
          </Panel>
          <Panel>
            <PanelHeader title="Bài làm của học viên" description={`${item.answer.length.toLocaleString("vi-VN")} ký tự`} />
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed">{item.answer}</p>
          </Panel>
          <Panel>
            <PanelHeader title="Hệ thống chấm" description="Mức đạt từng ý do mô hình xếp, đã qua hậu kiểm câu trích; điểm do code tính." />
            <div className="p-5">
              <GradeReport
                response={{ attemptId: item.id, result: item.result, rubric: item.rubric, citations: item.citations }}
              />
            </div>
          </Panel>
          {item.followUps.length > 0 && (
            <Panel>
              <PanelHeader title="Hỏi vặn" description="Câu hỏi vấn đáp hệ thống đặt sau khi chấm và câu trả lời của học viên." />
              <ol className="flex flex-col">
                {item.followUps.map((f) => (
                  <li key={f.id} className="flex flex-col gap-1.5 border-t px-5 py-4 text-sm first:border-t-0">
                    <span className="font-medium">{f.question}</span>
                    <span className="text-muted-foreground">{f.answer}</span>
                    <span className="text-xs tabular-nums text-primary">{f.score.toLocaleString("vi-VN")}/{f.maxScore.toLocaleString("vi-VN")} điểm</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <PanelHeader
              title="Giảng viên chấm"
              description={item.reviewedAt ? `${item.reviewer ?? "Giảng viên"} chấm lúc ${dateTime(item.reviewedAt)}` : "Chưa chấm"}
            />
            <div className="p-5">
              <LecturerScoreForm id={item.id} maxScore={item.maxScore} score={item.lecturerScore} note={item.lecturerNote} aiScore={item.score} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export default function GradingDetailPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Detail params={params} />
    </Suspense>
  );
}
