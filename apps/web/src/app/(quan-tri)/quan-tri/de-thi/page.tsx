import { ChevronRight, ClipboardList, FilePlus2, Library } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSubject } from "@/config/subjects";
import { AdminHeading, TONE_TEXT, toneOf } from "@/features/admin/components/AdminHeading";
import { Dash, Panel, TH } from "@/features/admin/components/AdminUi";
import { PhaseBadge } from "@/features/exams/components/PhaseBadge";
import { durationText, score10 } from "@/features/exams/logic";
import { listExams } from "@/features/exams/server/exams";
import { formatVnTime } from "@/features/exams/time";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Đề thi · Quản trị" };

async function Exams() {
  await requireTeacher();
  const exams = await listExams();

  if (exams.length === 0) {
    return (
      <Panel>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Chưa có đề thi</EmptyTitle>
            <EmptyDescription>
              Tạo đề từ ngân hàng câu hỏi, đặt thời gian làm bài, giờ mở, giờ đóng và lớp được giao. Học viên làm bài ở mục Đề thi trong menu tài khoản.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/quan-tri/de-thi/moi" />} nativeButton={false}>
              <FilePlus2 data-icon="inline-start" />
              Tạo đề thi đầu tiên
            </Button>
          </EmptyContent>
        </Empty>
      </Panel>
    );
  }

  return (
    <Panel>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(TH, "pl-5")}>Đề thi</TableHead>
            <TableHead className={TH}>Trạng thái</TableHead>
            <TableHead className={TH}>Lớp</TableHead>
            <TableHead className={TH}>Thời hạn</TableHead>
            <TableHead className={cn(TH, "text-right")}>Đã nộp</TableHead>
            <TableHead className={cn(TH, "text-right")}>Điểm TB</TableHead>
            <TableHead className={cn(TH, "w-8 pr-4")} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((e) => (
            <TableRow key={e.id} className="group relative">
              <TableCell className="max-w-80 py-3 pl-5">
                <Link
                  href={`/quan-tri/de-thi/${e.id}`}
                  className="flex flex-col gap-0.5 leading-tight outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                >
                  <span className="truncate font-medium group-hover:text-primary">{e.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {getSubject(e.subject)?.shortName} · {e.questionCount} câu · {durationText(e.durationMin)}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <PhaseBadge phase={e.phase} />
              </TableCell>
              <TableCell>
                {e.classes.length ? (
                  <span className="flex max-w-48 flex-wrap gap-1">
                    {e.classes.slice(0, 3).map((c) => (
                      <Badge key={c} variant="outline" className="bg-background">{c}</Badge>
                    ))}
                    {e.classes.length > 3 && <Badge variant="outline">+{e.classes.length - 3}</Badge>}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Mọi lớp</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {e.opensAt || e.closesAt ? (
                  <span className="flex flex-col leading-tight">
                    {e.opensAt && <span>Mở {formatVnTime(e.opensAt)}</span>}
                    {e.closesAt && <span>Đóng {formatVnTime(e.closesAt)}</span>}
                  </span>
                ) : (
                  "Không hạn"
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {e.submitted || <Dash />}
                {e.inProgress > 0 && <span className="block text-[11px] text-warn">{e.inProgress} đang làm</span>}
              </TableCell>
              <TableCell className={cn("text-right font-semibold tabular-nums", TONE_TEXT[toneOf(e.avgRatio)])}>
                {e.avgRatio === null ? <Dash /> : score10(Math.round(e.avgRatio * 1000), 1000)}
              </TableCell>
              <TableCell className="pr-4 text-muted-foreground/50">
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}

export default function ExamsPage() {
  return (
    <>
      <AdminHeading
        overline="Nội dung"
        title="Đề thi"
        description="Giao đề kiểm tra cho học viên theo lớp, có giờ mở, giờ đóng và thời gian làm bài. Điểm TB tính trên lượt cao nhất của mỗi học viên, thang 10."
        actions={
          <>
            <Button variant="outline" render={<Link href="/quan-tri/cau-hoi" />} nativeButton={false}>
              <Library data-icon="inline-start" />
              Ngân hàng câu hỏi
            </Button>
            <Button render={<Link href="/quan-tri/de-thi/moi" />} nativeButton={false}>
              <FilePlus2 data-icon="inline-start" />
              Tạo đề thi
            </Button>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Exams />
      </Suspense>
    </>
  );
}
