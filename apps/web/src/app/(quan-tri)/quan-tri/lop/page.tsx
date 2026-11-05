import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { Panel, PanelHeader } from "@/features/admin/components/AdminUi";
import { ChapterSummary, ChapterTable } from "@/features/admin/components/ChapterTable";
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
      <Panel>
        <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <StudentFilters classes={classes} showSearch={false} />
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            <span>
              <span className="font-semibold text-foreground tabular-nums">{students}</span> học viên có tài khoản
              {className ? ` · lớp ${className}` : ` · ${classes.length} lớp`}
            </span>
          </span>
        </div>
      </Panel>
      {subjects.map(({ subject, stats }) => (
        <Panel key={subject.id}>
          <PanelHeader
            title={`${subject.name} · ${className ? `lớp ${className}` : "mọi lớp"}`}
            description="Chỉ tính học viên đã đăng ký; điểm trắc nghiệm thang 10."
          />
          <ChapterSummary stats={stats} chapterCount={subject.chapters.length} />
          <ChapterTable subject={subject} stats={stats} cardTotals={deckCounts(subject.id, subject.chapters.map((c) => c.number))} />
        </Panel>
      ))}
    </div>
  );
}

export default function ClassPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <AdminHeading
        overline="Theo dõi"
        title="Theo lớp"
        description="Kết quả ôn tập của một lớp theo từng chương. Chương có tỷ lệ đạt thấp nhất được đánh dấu để ôn lại trên lớp."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <ClassStats searchParams={searchParams} />
      </Suspense>
    </>
  );
}
