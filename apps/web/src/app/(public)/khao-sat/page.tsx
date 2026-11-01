import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { SurveyForm } from "@/features/survey/components/SurveyForm";
import { PHASE_LABELS } from "@/features/survey/questions";
import { getSurvey } from "@/features/survey/server/responses";
import { env } from "@/lib/env";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { title: "Khảo sát ý kiến" };

async function SurveyContent() {
  await connection();
  const phase = env.SURVEY_PHASE;
  if (phase === "dong") {
    return (
      <Empty className="border bg-white py-16">
        <EmptyHeader>
          <EmptyTitle>Khảo sát hiện chưa mở</EmptyTitle>
          <EmptyDescription>Khoa sẽ thông báo khi mở đợt khảo sát tiếp theo.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const visitorId = await getVisitorId();
  const saved = visitorId ? await getSurvey(visitorId, phase) : null;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Đợt khảo sát: {PHASE_LABELS[phase]}</p>
      <SurveyForm phase={phase} initial={saved} />
    </div>
  );
}

export default function SurveyPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Khảo sát" }]}
        title="Khảo sát ý kiến"
        lead="Phiếu khảo sát ẩn danh, khoảng 3 phút, giúp Khoa đánh giá hiệu quả của trợ lý học tập và hoàn thiện trang web. Mỗi trình duyệt gửi một phiếu cho mỗi đợt."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <SurveyContent />
        </Suspense>
      </div>
    </>
  );
}
