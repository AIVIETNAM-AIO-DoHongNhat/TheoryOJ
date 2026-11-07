import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { ExamForm } from "@/features/exams/components/ExamForm";
import { examFormData } from "@/features/exams/server/form-data";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tạo đề thi · Quản trị" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function NewExam({ searchParams }: { searchParams: SearchParams }) {
  await requireTeacher();
  const mon = (await searchParams).mon;
  const subject = getSubject(typeof mon === "string" ? mon : "")?.active ? getSubject(mon as string)! : ACTIVE_SUBJECTS[0];
  const data = await examFormData(subject.id);
  return (
    <ExamForm
      draft={{
        id: null, subject: subject.id, title: "", description: "", questionKeys: [], durationMin: 15, opensAt: null, closesAt: null,
        classes: [], maxAttempts: 1, shuffle: true, reveal: "sau-han", status: "nhap", locked: false,
      }}
      {...data}
    />
  );
}

export default function NewExamPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <AdminHeading overline="Đề thi" title="Tạo đề thi" description="Chọn câu từ ngân hàng câu hỏi, đặt thời gian và lớp được giao. Lưu nháp để soạn tiếp, hoặc giao ngay." />
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <NewExam searchParams={searchParams} />
      </Suspense>
    </>
  );
}
