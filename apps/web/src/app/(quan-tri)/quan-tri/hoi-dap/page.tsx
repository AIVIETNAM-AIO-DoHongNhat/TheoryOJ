import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { ReviewControls, ReviewList } from "@/features/admin/components/ReviewLog";
import { getReviewCounts, getReviewLog } from "@/features/admin/server/review";
import { REVIEW_FILTERS, type ReviewFilter } from "@/features/admin/types";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hỏi đáp · Quản trị" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Log({ searchParams }: { searchParams: SearchParams }) {
  await requireTeacher("/quan-tri/hoi-dap");
  const params = await searchParams;
  const loc = one(params.loc);
  const filter: ReviewFilter = REVIEW_FILTERS.includes(loc as ReviewFilter) ? (loc as ReviewFilter) : "gan-co";
  const unreviewedOnly = one(params.xem) !== "tat-ca";
  const page = Math.max(1, Number(one(params.trang)) || 1);
  const [counts, { items, hasMore }] = await Promise.all([getReviewCounts(), getReviewLog({ filter, unreviewedOnly, page })]);

  const pageHref = (n: number) => {
    const next = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    next.set("trang", String(n));
    return `/quan-tri/hoi-dap?${next}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <ReviewControls filter={filter} unreviewedOnly={unreviewedOnly} counts={counts} />
      <ReviewList items={items} />
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between">
          <Button variant="outline" className="bg-card" disabled={page === 1} render={<Link href={pageHref(page - 1)} />} nativeButton={false}>
            <ChevronLeft data-icon="inline-start" />
            Trang trước
          </Button>
          <span className="text-sm text-muted-foreground">Trang {page}</span>
          <Button variant="outline" className="bg-card" disabled={!hasMore} render={<Link href={pageHref(page + 1)} />} nativeButton={false}>
            Trang sau
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <AdminHeading
        title="Nhật ký hỏi đáp"
        description="Câu trả lời của trợ lý cần giảng viên xem: tin nhắn bị gắn cờ (khiêu khích, chèn lệnh), câu bị học viên đánh giá 👎 và câu bị từ chối. Xem xong thì đánh dấu đã xem để danh sách gọn lại."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Log searchParams={searchParams} />
      </Suspense>
    </>
  );
}
