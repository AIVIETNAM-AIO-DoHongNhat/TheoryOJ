import { ArrowRight, BookOpenCheck, Hourglass, Landmark, PenLine, ShieldCheck, Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { BetaBadge, BetaNotice } from "@/features/open-answer/components/BetaNotice";
import { latestAttempts } from "@/features/open-answer/server/attempts";
import { rebuttalBanks } from "@/features/open-answer/server/bank";
import { rebuttalHref } from "@/features/review/paths";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Đấu trường phản bác",
  description: "Luyện viết bài phản bác quan điểm sai trái, chấm theo ba trục lý luận, văn kiện, thực tiễn. Bản thử nghiệm.",
};

const STEPS = [
  { icon: BookOpenCheck, title: "Lý luận", text: "Dùng đúng khái niệm, quy luật trong giáo trình để chỉ ra luận điệu sai ở đâu." },
  { icon: Landmark, title: "Văn kiện", text: "Dẫn quan điểm của Đảng trong các nghị quyết, văn kiện liên quan." },
  { icon: ShieldCheck, title: "Thực tiễn", text: "Đưa dẫn chứng thực tiễn, vạch trần thủ đoạn đánh tráo khái niệm, tuyệt đối hóa." },
];

/** Chưa có luận điệu nào được duyệt: giới thiệu Đấu trường sắp mở và chỉ sang tự luận để luyện trong lúc chờ. */
function ComingSoon({ pending }: { pending: number }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Hourglass className="size-6" />
      </span>
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="text-xl font-bold">Bộ luận điệu đầu tiên đang được Khoa rà soát</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {pending > 0 ? `${pending} luận điệu đã được soạn và đang chờ giảng viên duyệt lời văn, nguồn phản bác. ` : ""}
          Đấu trường sẽ mở cho học viên ngay khi Khoa duyệt xong. Trong lúc chờ, đồng chí có thể luyện tự luận theo chương:
          bài cũng được giảng viên chấm theo barem và nhận xét từng ý như ở đây.
        </p>
      </div>
      <Button render={<Link href="/on-tap" />} nativeButton={false}>
        <PenLine data-icon="inline-start" />
        Luyện tự luận theo chương
      </Button>
    </div>
  );
}

async function RebuttalListContent() {
  await connection();
  const user = await getCurrentUser();
  const teacher = user?.role === "giang-vien";
  const subjects = ACTIVE_SUBJECTS.map((subject) => {
    const numbers = subject.chapters.map((c) => c.number);
    return { subject, banks: rebuttalBanks(subject.id, numbers, teacher), all: rebuttalBanks(subject.id, numbers, true) };
  });
  const visible = subjects.filter((s) => s.banks.length > 0);
  const pending = subjects.reduce((n, s) => n + s.all.reduce((k, b) => k + b.items.filter((i) => !i.reviewed).length, 0), 0);
  const latest = new Map(
    user
      ? (await Promise.all(
          visible.map((s) => latestAttempts(user.visitorId, s.subject.id, "phan_bac", s.banks.flatMap((b) => b.items.map((i) => i.id)))),
        )).flatMap((m, i) => [...m].map(([id, a]) => [`${visible[i].subject.id}/${id}`, a] as const))
      : [],
  );

  if (visible.length === 0) return <ComingSoon pending={pending} />;

  return (
    <div className="flex flex-col gap-10">
      {visible.map(({ subject, banks }) => (
        <section key={subject.id} id={`mon-${subject.id}`} className="flex scroll-mt-24 flex-col gap-6">
          {ACTIVE_SUBJECTS.length > 1 && <h2 className="text-2xl font-bold">{subject.name}</h2>}
          {banks.map((bank) => {
            const chapter = subject.chapters.find((c) => c.number === bank.chapter);
            return (
              <div key={bank.chapter} className="flex flex-col gap-3">
                <h3 className="flex flex-wrap items-center gap-2 text-base font-bold">
                  {subject.shortName} · Chương {bank.chapter}. {chapter?.title}
                </h3>
                <ul className="grid gap-3 md:grid-cols-2">
                  {bank.items.map((item) => {
                    const done = latest.get(`${subject.id}/${item.id}`);
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
                                Lần gần nhất: {done.gradedAt && done.score !== null ? `${done.score.toLocaleString("vi-VN")}/${done.maxScore}` : "Chờ chấm"}
                              </span>
                            )}
                          </span>
                          <span className="font-semibold leading-snug">{item.title}</span>
                          {!item.reviewed && (
                            <Badge variant="outline" className="self-start">Bản nháp, chỉ giảng viên thấy</Badge>
                          )}
                          <span className="mt-auto flex items-center gap-1 text-sm text-primary">
                            Viết bài phản bác
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export default function RebuttalListPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Đấu trường phản bác" }]}
        title={
          <>
            <span className="mb-2 flex flex-wrap items-center gap-2 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Đấu trường phản bác
              <BetaBadge />
            </span>
            Luyện đấu tranh phản bác quan điểm sai trái
          </>
        }
        lead="Mỗi đề là một luận điệu sai trái đã bị báo chí chính thống phản bác. Đồng chí viết bài phản bác và gửi giảng viên phụ trách môn; giảng viên chấm theo ba trục lý luận, văn kiện, thực tiễn, chỉ ra lỗi lập luận đã và chưa vạch trần. Kèm kết quả là bài phản bác đã đăng để đối chiếu."
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
        <BetaNotice />
        <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
          <RebuttalListContent />
        </Suspense>
      </div>
    </>
  );
}
