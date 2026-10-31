import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { EXERCISES, randomExercise } from "@/domain/ktct/exercises";
import { ExerciseRunner } from "@/features/exercise/components/ExerciseRunner";

export function generateStaticParams() {
  return ACTIVE_SUBJECTS.flatMap((s) => Object.keys(EXERCISES[s.id] ?? {}).map((so) => ({ mon: s.id, so })));
}

type Params = PageProps<"/mon/[mon]/chuong/[so]/bai-tap">["params"];

async function load(params: Params) {
  const { mon, so } = await params;
  const subject = getSubject(mon);
  const chapter = subject?.chapters.find((c) => c.number === Number(so));
  const templates = subject?.active && chapter ? EXERCISES[subject.id]?.[chapter.number] : undefined;
  return subject && chapter && templates?.length ? { subject, chapter, templates } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  return data ? { title: `Bài tập chương ${data.chapter.number}` } : {};
}

async function ExercisePageContent({ params }: { params: Params }) {
  const data = await load(params);
  if (!data) notFound();
  const { subject, chapter, templates } = data;
  // Đề đầu tiên sinh ở máy chủ để trang hiện ngay, các đề sau sinh trên trình duyệt.
  await connection();
  const initial = randomExercise(templates);

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Học liệu", href: "/mon" },
          { label: subject.shortName, href: `/mon/${subject.id}` },
          { label: `Chương ${chapter.number}`, href: `/mon/${subject.id}/chuong/${chapter.number}` },
          { label: "Bài tập" },
        ]}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Bài tập tính toán chương {chapter.number}
            </span>
            {chapter.title}
          </>
        }
        lead="Số liệu đổi mỗi lần làm. Nhập đáp số, dùng dấu phẩy cho phần thập phân; hệ thống chấm và hiện lời giải từng bước. Sai số làm tròn đến 0,5 % vẫn được tính là đúng."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <ExerciseRunner subject={subject.id} chapter={chapter.number} initial={initial} />
      </div>
    </>
  );
}

export default function ExercisePage({ params }: PageProps<"/mon/[mon]/chuong/[so]/bai-tap">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExercisePageContent params={params} />
    </Suspense>
  );
}
