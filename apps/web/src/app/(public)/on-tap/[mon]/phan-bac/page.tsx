import { ArrowRight, BookOpenCheck, Landmark, ShieldCheck, Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { latestAttempts } from "@/features/open-answer/server/attempts";
import { rebuttalBanks } from "@/features/open-answer/server/bank";
import { rebuttalHref, reviewHref } from "@/features/review/paths";
import { getCurrentUser } from "@/lib/auth/session";

type Props = PageProps<"/on-tap/[mon]/phan-bac">;

export function generateStaticParams() {
  return ACTIVE_SUBJECTS.map((s) => ({ mon: s.id }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const subject = getSubject((await params).mon);
  return subject ? { title: `Đấu trường phản bác – ${subject.shortName}` } : {};
}

const STEPS = [
  { icon: BookOpenCheck, title: "Lý luận", text: "Dùng đúng khái niệm, quy luật trong giáo trình để chỉ ra luận điệu sai ở đâu." },
  { icon: Landmark, title: "Văn kiện", text: "Dẫn quan điểm của Đảng trong các nghị quyết, văn kiện liên quan." },
  { icon: ShieldCheck, title: "Thực tiễn", text: "Đưa dẫn chứng thực tiễn, chỉ ra thủ đoạn đánh tráo khái niệm, tuyệt đối hóa." },
];

async function RebuttalListContent({ params }: Pick<Props, "params">) {
  const subject = getSubject((await params).mon);
  if (!subject?.active) notFound();
  await connection();
  const user = await getCurrentUser();
  const teacher = user?.role === "giang-vien";
  const banks = rebuttalBanks(subject.id, subject.chapters.map((c) => c.number), teacher);
  const ids = banks.flatMap((b) => b.items.map((i) => i.id));
  const latest = user ? await latestAttempts(user.visitorId, subject.id, "phan_bac", ids) : new Map();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ôn tập", href: "/on-tap" }, { label: subject.shortName, href: reviewHref(subject.id) }, { label: "Đấu trường phản bác" }]}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">Đấu trường phản bác</span>
            Luyện đấu tranh phản bác quan điểm sai trái
          </>
        }
        lead="Mỗi đề là một luận điệu sai trái đã bị báo chí chính thống phản bác. Đồng chí viết bài phản bác; hệ thống chấm theo ba trục lý luận, văn kiện, thực tiễn, chỉ ra lỗi lập luận đã và chưa vạch trần, rồi giới thiệu bài phản bác đã đăng để đối chiếu."
      >
        <ol className="grid max-w-4xl gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.title} className="flex flex-col gap-1.5 bg-card p-4">
              <span className="flex items-center gap-2 text-sm font-bold">
                <s.icon className="size-4 text-primary" />
                {s.title}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">{s.text}</span>
            </li>
          ))}
        </ol>
      </PageHeader>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:py-12">
        {banks.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyTitle>Khoa đang duyệt bộ luận điệu</EmptyTitle>
              <EmptyDescription>
                Các luận điệu chỉ hiện cho học viên sau khi giảng viên duyệt nội dung và nguồn phản bác. Trong lúc chờ, đồng chí luyện tự luận theo chương.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          banks.map((bank) => {
            const chapter = subject.chapters.find((c) => c.number === bank.chapter);
            return (
              <section key={bank.chapter} className="flex flex-col gap-3">
                <h2 className="flex flex-wrap items-center gap-2 text-base font-bold">
                  Chương {bank.chapter}. {chapter?.title}
                  {!bank.reviewed && <Badge variant="outline">Bản nháp, chỉ giảng viên thấy</Badge>}
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {bank.items.map((item) => {
                    const done = latest.get(item.id);
                    return (
                      <li key={item.id}>
                        <Link
                          href={rebuttalHref(subject.id, item.id)}
                          className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-primary-soft"
                        >
                          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
                            <Swords className="size-3.5" />
                            Luận điệu cần phản bác
                            {done && (
                              <span className="ml-auto normal-case tracking-normal text-muted-foreground tabular-nums">
                                Lần gần nhất: {(done.lecturerScore ?? done.result.score).toLocaleString("vi-VN")}/{done.result.maxScore}
                              </span>
                            )}
                          </span>
                          <span className="font-semibold leading-snug">{item.title}</span>
                          <span className="mt-auto flex items-center gap-1 text-sm text-primary">
                            Viết bài phản bác
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}

export default function RebuttalListPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RebuttalListContent params={params} />
    </Suspense>
  );
}
