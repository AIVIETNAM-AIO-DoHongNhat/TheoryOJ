import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { AdminHeading, dateTime, score10 } from "@/features/admin/components/AdminHeading";
import { StudentFilters } from "@/features/admin/components/StudentFilters";
import { getClasses, getStudents } from "@/features/admin/server/stats";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Học viên · Quản trị" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Students({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher("/quan-tri/hoc-vien");
  const params = await searchParams;
  const className = one(params.lop) ?? null;
  const [classes, students] = await Promise.all([getClasses(), getStudents({ q: one(params.q), className })]);
  const chapterCount = ACTIVE_SUBJECTS.reduce((n, s) => n + s.chapters.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <StudentFilters classes={classes} />
      {students.length === 0 ? (
        <Empty className="border bg-card py-16">
          <EmptyHeader>
            <EmptyTitle>Không có học viên phù hợp</EmptyTitle>
            <EmptyDescription>
              Học viên tự đăng ký tài khoản ở trang Đăng ký bằng mã học viên. Số liệu của người chưa đăng nhập vẫn có ở trang Tổng quan.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Học viên</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead className="text-right">Chương đạt</TableHead>
                  <TableHead className="text-right">Điểm TB cao nhất</TableHead>
                  <TableHead className="text-right">Lượt trắc nghiệm</TableHead>
                  <TableHead className="text-right">Thẻ đã thuộc</TableHead>
                  <TableHead className="text-right">Câu hỏi trợ lý</TableHead>
                  <TableHead className="pr-5">Hoạt động gần nhất</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5">
                      <Link href={`/quan-tri/hoc-vien/${encodeURIComponent(s.studentCode)}`} className="flex flex-col hover:text-primary">
                        <span className="font-medium">{s.fullName}</span>
                        <span className="text-xs text-muted-foreground">{s.studentCode}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.chaptersPassed > 0 ? <Badge variant="secondary">{s.chaptersPassed}/{chapterCount}</Badge> : `0/${chapterCount}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{score10(s.bestAvg)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.quizzes}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.cardsMastered}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.questions}</TableCell>
                    <TableCell className="pr-5 text-muted-foreground">{dateTime(s.lastActive)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        {students.length} học viên{className ? ` lớp ${className}` : ""}. Bấm vào tên để xem tiến độ chi tiết hoặc đặt lại mật khẩu.
      </p>
    </div>
  );
}

export default function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <AdminHeading
        title="Học viên"
        description="Học viên đã đăng ký tài khoản. Điểm trắc nghiệm quy về thang 10, tính trung bình lượt cao nhất của các chương đã làm."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Students searchParams={searchParams} />
      </Suspense>
    </>
  );
}
