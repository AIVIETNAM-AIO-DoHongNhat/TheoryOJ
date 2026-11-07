import { ChevronRight, UserRoundSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { AdminHeading, dateTime, score10, timeAgo, TONE_TEXT, toneOf } from "@/features/admin/components/AdminHeading";
import { Dash, Initials, Panel, TH } from "@/features/admin/components/AdminUi";
import { StudentFilters } from "@/features/admin/components/StudentFilters";
import { getClasses, getStudents } from "@/features/admin/server/stats";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Học viên · Quản trị" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Students({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const params = await searchParams;
  const className = one(params.lop) ?? null;
  const [classes, students] = await Promise.all([getClasses(), getStudents({ q: one(params.q), className })]);
  const chapterCount = ACTIVE_SUBJECTS.reduce((n, s) => n + s.chapters.length, 0);
  const now = new Date();

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <StudentFilters classes={classes} />
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{students.length}</span> học viên{className ? ` · lớp ${className}` : ""}
        </span>
      </div>

      {students.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundSearch />
            </EmptyMedia>
            <EmptyTitle>Không có học viên phù hợp</EmptyTitle>
            <EmptyDescription>
              Học viên đăng ký ở trang Đăng ký bằng mã có trong Danh sách lớp. Số liệu của người chưa đăng nhập vẫn có ở trang Tổng quan.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(TH, "pl-5")}>Học viên</TableHead>
              <TableHead className={TH}>Lớp</TableHead>
              <TableHead className={cn(TH, "w-40")}>Chương đạt</TableHead>
              <TableHead className={cn(TH, "text-right")}>Điểm TB</TableHead>
              <TableHead className={cn(TH, "text-right")}>Trắc nghiệm</TableHead>
              <TableHead className={cn(TH, "text-right")}>Thẻ thuộc</TableHead>
              <TableHead className={cn(TH, "text-right")}>Câu hỏi</TableHead>
              <TableHead className={TH}>Hoạt động</TableHead>
              <TableHead className={cn(TH, "w-8 pr-4")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id} className="group relative">
                <TableCell className="py-2.5 pl-5">
                  {/* Cả hàng bấm được: lớp phủ của liên kết trải lên toàn hàng. */}
                  <Link
                    href={`/quan-tri/hoc-vien/${encodeURIComponent(s.studentCode)}`}
                    className="flex items-center gap-3 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    <Initials name={s.fullName} />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="font-medium group-hover:text-primary">{s.fullName}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{s.studentCode}</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="inline-flex h-6 items-center rounded-md border bg-background px-2 text-xs font-medium">{s.className}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(s.chaptersPassed / Math.max(1, chapterCount)) * 100}%` }} />
                    </div>
                    <span className="text-xs tabular-nums">
                      <span className="font-medium">{s.chaptersPassed}</span>
                      <span className="text-muted-foreground">/{chapterCount}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cn("text-right font-semibold tabular-nums", TONE_TEXT[toneOf(s.bestAvg)])}>
                  {s.bestAvg === null ? <Dash /> : score10(s.bestAvg)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{s.quizzes || <Dash />}</TableCell>
                <TableCell className="text-right tabular-nums">{s.cardsMastered || <Dash />}</TableCell>
                <TableCell className="text-right tabular-nums">{s.questions || <Dash />}</TableCell>
                <TableCell className="text-xs text-muted-foreground" title={dateTime(s.lastActive)}>
                  {timeAgo(s.lastActive, now)}
                </TableCell>
                <TableCell className="pr-4 text-muted-foreground/50">
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

export default function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <AdminHeading
        overline="Theo dõi"
        title="Học viên"
        description="Học viên đã đăng ký tài khoản. Điểm TB là trung bình lượt cao nhất của các chương đã làm, thang 10. Bấm vào một hàng để xem chi tiết hoặc đặt lại mật khẩu."
      />
      <Suspense fallback={<Skeleton className="h-[28rem] rounded-2xl" />}>
        <Students searchParams={searchParams} />
      </Suspense>
    </>
  );
}
