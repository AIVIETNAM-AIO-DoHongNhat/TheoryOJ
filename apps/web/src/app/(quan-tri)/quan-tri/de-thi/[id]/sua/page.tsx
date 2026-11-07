import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { ExamForm } from "@/features/exams/components/ExamForm";
import { getExamDraft } from "@/features/exams/server/exams";
import { examFormData } from "@/features/exams/server/form-data";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sửa đề thi · Quản trị" };

async function EditExam({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTeacher(`/quan-tri/de-thi/${id}/sua`);
  const draft = /^\d+$/.test(id) ? await getExamDraft(Number(id)) : null;
  if (!draft) notFound();
  const data = await examFormData(draft.subject);
  return (
    <>
      <AdminHeading overline="Sửa đề thi" title={draft.title} />
      <ExamForm draft={draft} {...data} />
    </>
  );
}

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
      <EditExam params={params} />
    </Suspense>
  );
}
