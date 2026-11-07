import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubject } from "@/config/subjects";
import { AdminHeading, dateTime } from "@/features/admin/components/AdminHeading";
import { Panel, PanelHeader } from "@/features/admin/components/AdminUi";
import { LecturerGradingForm } from "@/features/admin/components/LecturerGradingForm";
import { getGraded } from "@/features/admin/server/grading";
import { KIND_LABELS } from "@/features/open-answer/types";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Chấm bài · Quản trị" };

type Params = Promise<{ id: string }>;

async function Detail({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireTeacher();
  // Bài ngoài môn phụ trách cũng trả 404 như bài không tồn tại.
  const item = Number.isInteger(Number(id)) ? await getGraded(Number(id), user.subjects) : null;
  if (!item) notFound();
  const subject = getSubject(item.subject);

  return (
    <>
      <AdminHeading
        overline={`${KIND_LABELS[item.kind]} · ${subject?.shortName ?? item.subject} chương ${item.chapter} · ${item.itemId}`}
        title={item.student ? `${item.student.name} (${item.student.code})` : "Bài làm"}
        description={`${item.student ? `Lớp ${item.student.className} · ` : ""}Nộp lúc ${dateTime(item.submittedAt)}${
          item.gradedAt ? ` · ${item.grader ?? "Giảng viên"} đã chấm lúc ${dateTime(item.gradedAt)}` : " · Chờ chấm"
        }`}
        actions={
          <Button variant="outline" className="bg-card" render={<Link href="/quan-tri/cham-bai" />} nativeButton={false}>
            <ArrowLeft data-icon="inline-start" />
            Hàng chờ chấm
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <PanelHeader title={item.kind === "phan_bac" ? "Luận điệu cần phản bác" : "Đề bài"} />
            <p className="px-5 py-4 text-[15px] font-medium leading-relaxed">{item.prompt}</p>
          </Panel>
          <Panel>
            <PanelHeader title="Bài làm của học viên" description={`${item.answer.length.toLocaleString("vi-VN")} ký tự`} />
            <p className="max-h-[60vh] overflow-y-auto whitespace-pre-line px-5 py-4 text-sm leading-relaxed">{item.answer}</p>
          </Panel>
        </div>
        <Panel>
          <PanelHeader
            title={item.gradedAt ? "Chấm lại" : "Chấm theo barem"}
            description="Chọn mức đạt từng ý; tổng điểm tự tính theo barem. Học viên thấy điểm và nhận xét ngay khi lưu."
          />
          <div className="p-5">
            <LecturerGradingForm id={item.id} kind={item.kind} rubric={item.rubric} initial={item.result} />
          </div>
        </Panel>
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
