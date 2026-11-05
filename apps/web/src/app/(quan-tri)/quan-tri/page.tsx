import { Activity, ArrowRight, Ban, CircleCheck, Flag, GalleryVerticalEnd, Layers, ListChecks, MessageSquareText, ThumbsDown } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { ActivityChart } from "@/features/admin/components/ActivityChart";
import { AdminHero } from "@/features/admin/components/AdminHero";
import { Panel, PanelHeader, StatTile } from "@/features/admin/components/AdminUi";
import { ChapterSummary, ChapterTable } from "@/features/admin/components/ChapterTable";
import { getReviewCounts } from "@/features/admin/server/review";
import { getChapterStats, getDailyActivity, getOverview } from "@/features/admin/server/stats";
import { deckCounts } from "@/features/flashcards/server/deck";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tổng quan · Quản trị" };

async function Overview() {
  const user = await requireTeacher();
  const [o, counts, activity] = await Promise.all([getOverview(), getReviewCounts(), getDailyActivity(14)]);
  const subjects = await Promise.all(ACTIVE_SUBJECTS.map(async (s) => ({ subject: s, stats: await getChapterStats(s.id, null) })));

  const queues = [
    { href: "/quan-tri/hoi-dap?loc=gan-co", icon: Flag, label: "Gắn cờ", hint: "Khiêu khích, chèn lệnh", value: counts["gan-co"], urgent: true },
    { href: "/quan-tri/hoi-dap?loc=danh-gia", icon: ThumbsDown, label: "Đánh giá thấp", hint: "Học viên bấm không hữu ích", value: counts["danh-gia"], urgent: true },
    { href: "/quan-tri/hoi-dap?loc=tu-choi", icon: Ban, label: "Bị từ chối", hint: "Trợ lý không trả lời", value: counts["tu-choi"], urgent: false },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminHero name={user.fullName} overview={o} now={new Date()} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Activity} label="Người ôn tập · 7 ngày" value={o.active7} hint={`Trên ${o.accounts} tài khoản học viên`} />
        <StatTile icon={MessageSquareText} label="Câu hỏi trợ lý · 7 ngày" value={o.questions7} hint={`${o.refused7} câu bị từ chối`} />
        <StatTile icon={ListChecks} label="Lượt trắc nghiệm · 7 ngày" value={o.quizzes7} hint="Tính mọi lượt, kể cả làm lại" />
        <StatTile icon={Layers} label="Thẻ ghi nhớ được ôn · 7 ngày" value={o.cardReviews7} hint="Theo lần ôn gần nhất của mỗi thẻ" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ActivityChart data={activity} className="lg:col-span-2" />

        <Panel className="flex flex-col">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
                o.toReview ? "bg-warn-soft text-warn ring-1 ring-warn/20" : "bg-primary-soft text-primary ring-1 ring-primary/15",
              )}
            >
              {o.toReview ? <Flag className="size-[18px]" /> : <CircleCheck className="size-[18px]" />}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="font-heading text-base font-semibold leading-tight">{o.toReview ? `${o.toReview} câu cần xem` : "Đã xem hết"}</span>
              <span className="text-xs text-muted-foreground">
                {o.toReview ? "Gắn cờ hoặc đánh giá thấp, chưa xem" : "Không còn câu gắn cờ hay bị đánh giá thấp"}
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            {queues.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3 rounded-xl border bg-subtle/60 px-3.5 py-3 transition-colors hover:border-primary/30 hover:bg-primary-soft"
              >
                <q.icon className={cn("size-4 shrink-0", q.value && q.urgent ? "text-warn" : "text-muted-foreground")} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="text-[13px] font-medium">{q.label}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{q.hint}</span>
                </span>
                <span className={cn("font-heading text-xl font-bold tabular-nums", !q.value && "text-muted-foreground/50")}>{q.value}</span>
              </Link>
            ))}
          </div>
          <div className="border-t p-4">
            <Button render={<Link href="/quan-tri/hoi-dap" />} nativeButton={false} variant="outline" className="w-full">
              Mở nhật ký hỏi đáp
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </Panel>
      </div>

      {subjects.map(({ subject, stats }) => (
        <Panel key={subject.id}>
          <PanelHeader
            title={`Kết quả theo chương · ${subject.name}`}
            description="Mọi người dùng, kể cả chưa đăng nhập. Điểm thang 10; điểm lượt đầu cho biết mức hiểu bài ban đầu."
            actions={
              <Button variant="outline" size="sm" render={<Link href="/quan-tri/lop" />} nativeButton={false}>
                <GalleryVerticalEnd data-icon="inline-start" />
                Xem theo lớp
              </Button>
            }
          />
          <ChapterSummary stats={stats} chapterCount={subject.chapters.length} />
          <ChapterTable subject={subject} stats={stats} cardTotals={deckCounts(subject.id, subject.chapters.map((c) => c.number))} />
        </Panel>
      ))}

      <p className="text-xs text-muted-foreground">
        Số liệu xuất cho hồ sơ sáng kiến: chạy <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">scripts/report.mts</code>.
      </p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export default function AdminHome() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}
