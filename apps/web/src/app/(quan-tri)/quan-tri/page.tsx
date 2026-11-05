import { ArrowRight, Flag, GalleryVerticalEnd, ListChecks, MessageSquareText, ThumbsUp, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { AdminHeading, pct } from "@/features/admin/components/AdminHeading";
import { ChapterTable } from "@/features/admin/components/ChapterTable";
import { getReviewCounts } from "@/features/admin/server/review";
import { getChapterStats, getOverview } from "@/features/admin/server/stats";
import { deckCounts } from "@/features/flashcards/server/deck";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tổng quan · Quản trị" };

async function Overview() {
  await requireTeacher();
  const [o, counts] = await Promise.all([getOverview(), getReviewCounts()]);
  const subjects = await Promise.all(ACTIVE_SUBJECTS.map(async (s) => ({ subject: s, stats: await getChapterStats(s.id, null) })));

  const tiles = [
    { icon: Users, label: "Học viên có tài khoản", value: o.accounts, hint: `${o.active7} người dùng hoạt động trong 7 ngày` },
    { icon: MessageSquareText, label: "Câu hỏi trợ lý, 7 ngày", value: o.questions7, hint: `${o.refused7} câu bị từ chối` },
    { icon: ListChecks, label: "Lượt trắc nghiệm, 7 ngày", value: o.quizzes7, hint: `${o.cardReviews7} thẻ ghi nhớ được ôn` },
    { icon: ThumbsUp, label: "Đánh giá hữu ích", value: pct(o.helpful), hint: `Trên ${o.ratings} lượt đánh giá` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <t.icon className="size-4 text-primary" />
                {t.label}
              </CardDescription>
              <span className="font-heading text-3xl font-bold tabular-nums">{t.value}</span>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className={o.toReview ? "bg-warn-soft ring-warn/30" : undefined}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Flag className={o.toReview ? "mt-0.5 size-5 text-warn" : "mt-0.5 size-5 text-primary"} />
            <div className="flex flex-col gap-1">
              <CardTitle>{o.toReview ? `${o.toReview} câu trả lời cần xem` : "Không có câu trả lời nào cần xem"}</CardTitle>
              <CardDescription>
                {counts["gan-co"]} tin nhắn bị gắn cờ (khiêu khích, chèn lệnh), {counts["danh-gia"]} câu trả lời bị học viên đánh giá 👎,
                {" "}{counts["tu-choi"]} câu bị từ chối chưa xem.
              </CardDescription>
            </div>
          </div>
          <Button render={<Link href="/quan-tri/hoi-dap" />} nativeButton={false} className="shrink-0">
            Mở nhật ký hỏi đáp
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardHeader>
      </Card>

      {subjects.map(({ subject, stats }) => (
        <Card key={subject.id}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Kết quả theo chương: {subject.name}</CardTitle>
              <CardDescription>
                Mọi người dùng, kể cả chưa đăng nhập. Điểm trắc nghiệm quy về thang 10; lượt đầu cho biết mức hiểu bài ban đầu.
              </CardDescription>
            </div>
            <Button variant="outline" render={<Link href="/quan-tri/lop" />} nativeButton={false} className="shrink-0">
              <GalleryVerticalEnd data-icon="inline-start" />
              Xem theo lớp
            </Button>
          </CardHeader>
          <CardContent>
            <ChapterTable subject={subject} stats={stats} cardTotals={deckCounts(subject.id, subject.chapters.map((c) => c.number))} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminHome() {
  return (
    <>
      <AdminHeading
        title="Tổng quan"
        description="Mức độ sử dụng, việc cần xem và kết quả ôn tập của học viên. Số liệu xuất cho hồ sơ sáng kiến dùng scripts/report.mts."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Overview />
      </Suspense>
    </>
  );
}
