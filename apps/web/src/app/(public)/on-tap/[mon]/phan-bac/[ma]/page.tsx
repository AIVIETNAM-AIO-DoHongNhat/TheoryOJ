import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { AnswerRunner } from "@/features/open-answer/components/AnswerRunner";
import { latestAttempts } from "@/features/open-answer/server/attempts";
import { findRebuttal, rebuttalBanks } from "@/features/open-answer/server/bank";
import { AXES, AXIS_LABELS, type GradeResponse } from "@/features/open-answer/types";
import { rebuttalHref, reviewHref } from "@/features/review/paths";
import { getCurrentUser } from "@/lib/auth/session";

type Props = PageProps<"/on-tap/[mon]/phan-bac/[ma]">;

export const metadata: Metadata = { title: "Viết bài phản bác" };

/** Dựng sẵn khung trang cho mọi luận điệu, kể cả bản nháp; nội dung và quyền xem quyết định lúc mở trang. */
export function generateStaticParams() {
  return ACTIVE_SUBJECTS.flatMap((s) =>
    rebuttalBanks(s.id, s.chapters.map((c) => c.number), true).flatMap((b) => b.items.map((i) => ({ mon: s.id, ma: i.id }))),
  );
}

async function RebuttalContent({ params }: Pick<Props, "params">) {
  const { mon, ma } = await params;
  const subject = getSubject(mon);
  if (!subject?.active) notFound();
  await connection();
  const user = await getCurrentUser();
  const teacher = user?.role === "giang-vien";
  const found = findRebuttal(subject.id, subject.chapters.map((c) => c.number), ma, teacher);
  if (!found) notFound();
  const { bank, item } = found;

  const previous = user ? (await latestAttempts(user.visitorId, subject.id, "phan_bac", [item.id])).get(item.id) : undefined;
  const initial: GradeResponse | null = previous
    ? {
        attemptId: previous.id,
        result: previous.result,
        rubric: previous.rubric,
        citations: previous.citations,
        published: item.published,
        lecturerScore: previous.lecturerScore,
        lecturerNote: previous.lecturerNote,
      }
    : null;
  const axes = AXES.filter((a) => item.rubric.some((p) => p.axis === a));

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Ôn tập", href: "/on-tap" },
          { label: subject.shortName, href: reviewHref(subject.id) },
          { label: "Đấu trường phản bác", href: rebuttalHref(subject.id) },
          { label: item.title.replace(/^"|"$/g, "") },
        ]}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Phản bác · Chương {bank.chapter}
            </span>
            {item.title}
          </>
        }
        lead={`Bài phản bác được chấm theo ${axes.length} trục: ${axes.map((a) => AXIS_LABELS[a].toLowerCase()).join(", ")}, cùng các lỗi lập luận cần vạch trần. Bài đồng tình hoặc chỉ nhắc lại luận điệu được 0 điểm.`}
      >
        {!bank.reviewed && <Badge variant="outline" className="self-start bg-card">Bản nháp, chỉ giảng viên thấy</Badge>}
      </PageHeader>

      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-10 sm:py-12">
        <section className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
            <TriangleAlert className="size-4" />
            Luận điệu sai trái · tư liệu luyện phản bác
          </span>
          <blockquote className="text-base font-medium leading-relaxed">{item.claim}</blockquote>
          <p className="text-xs text-muted-foreground">
            Luận điệu này đã được báo chí chính thống phản bác; nguồn được giới thiệu sau khi đồng chí nộp bài.
          </p>
        </section>

        {user ? (
          <>
            {teacher && (
              <Alert>
                <AlertDescription>Đồng chí đang thử bằng tài khoản giảng viên; lượt làm không tính vào số liệu học viên.</AlertDescription>
              </Alert>
            )}
            <AnswerRunner
              key={item.id}
              target={{ kind: "phan_bac", subject: subject.id, itemId: item.id }}
              initial={initial}
              initialAnswer={previous?.answer}
              placeholder="Viết bài phản bác: chỉ ra luận điệu sai ở đâu, dùng lý luận trong giáo trình, dẫn văn kiện của Đảng và dẫn chứng thực tiễn."
            />
          </>
        ) : (
          <StudentGate user={user} next={rebuttalHref(subject.id, item.id)} action="viết bài phản bác" />
        )}
      </div>
    </>
  );
}

export default function RebuttalPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RebuttalContent params={params} />
    </Suspense>
  );
}
