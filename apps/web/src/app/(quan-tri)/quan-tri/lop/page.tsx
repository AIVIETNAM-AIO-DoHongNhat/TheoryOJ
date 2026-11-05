import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { ChapterTable } from "@/features/admin/components/ChapterTable";
import { StudentFilters } from "@/features/admin/components/StudentFilters";
import { getChapterStats, getClasses } from "@/features/admin/server/stats";
import { deckCounts } from "@/features/flashcards/server/deck";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Theo lớp · Quản trị" };

async function ClassStats({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher("/quan-tri/lop");
  const lop = (await searchParams).lop;
  const className = (Array.isArray(lop) ? lop[0] : lop) ?? null;
  const classes = await getClasses();
  const students = className ? classes.find((c) => c.name === className)?.students ?? 0 : classes.reduce((n, c) => n + c.students, 0);
  const subjects = await Promise.all(ACTIVE_SUBJECTS.map(async (s) => ({ subject: s, stats: await getChapterStats(s.id, className) })));

  return (
    <div className="flex flex-col gap-6">
      <StudentFilters classes={classes} showSearch={false} />
      {subjects.map(({ subject, stats }) => (
        <Card key={subject.id}>
          <CardHeader>
            <CardTitle>
              {subject.name}: {className ? `lớp ${className}` : "mọi lớp"}
            </CardTitle>
            <CardDescription>
              {students} học viên có tài khoản. Chỉ tính học viên đã đăng ký; điểm trắc nghiệm quy về thang 10.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChapterTable subject={subject} stats={stats} cardTotals={deckCounts(subject.id, subject.chapters.map((c) => c.number))} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ClassPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <AdminHeading
        title="Theo lớp"
        description="Kết quả ôn tập của một lớp theo từng chương: điểm lượt đầu, điểm cao nhất, tỷ lệ đạt và số thẻ đã thuộc. Chương có tỷ lệ đạt thấp nhất được đánh dấu để ôn lại trên lớp."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ClassStats searchParams={searchParams} />
      </Suspense>
    </>
  );
}
