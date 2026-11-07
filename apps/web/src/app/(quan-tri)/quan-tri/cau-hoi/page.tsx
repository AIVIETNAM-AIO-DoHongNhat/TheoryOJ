import { CircleCheck, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { AdminHeading } from "@/features/admin/components/AdminHeading";
import { ChapterNo, Panel, PanelHeader } from "@/features/admin/components/AdminUi";
import { QuestionManager } from "@/features/question-bank/components/QuestionManager";
import { getAdminChapter, getChapterSummaries } from "@/features/question-bank/server/questions";
import { requireTeacher } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ngân hàng câu hỏi · Quản trị" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Bank({ searchParams }: { searchParams: SearchParams }) {
  await requireTeacher("/quan-tri/cau-hoi");
  const params = await searchParams;
  const subject = getSubject(one(params.mon) ?? "")?.active ? getSubject(one(params.mon)!)! : ACTIVE_SUBJECTS[0];
  const requested = Number(one(params.chuong));
  const chapter = subject.chapters.find((c) => c.number === requested) ?? subject.chapters[0];
  const [summaries, data] = await Promise.all([getChapterSummaries(subject), getAdminChapter(subject.id, chapter.number)]);
  const href = (mon: string, chuong: number) => `/quan-tri/cau-hoi?mon=${mon}&chuong=${chuong}`;

  return (
    <div className="flex flex-col gap-6">
      {ACTIVE_SUBJECTS.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {ACTIVE_SUBJECTS.map((s) => (
            <Button key={s.id} variant={s.id === subject.id ? "default" : "outline"} size="sm" render={<Link href={href(s.id, s.chapters[0].number)} />} nativeButton={false}>
              {s.shortName}
            </Button>
          ))}
        </div>
      )}

      <nav aria-label="Chọn chương" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((c) => {
          const active = c.chapter === chapter.number;
          return (
            <Link
              key={c.chapter}
              href={href(subject.id, c.chapter)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-start gap-3 rounded-xl border bg-card px-3.5 py-3 transition-colors hover:border-primary/40",
                active && "border-primary bg-primary-soft ring-1 ring-primary/30",
              )}
            >
              <ChapterNo n={c.chapter} />
              <span className="flex min-w-0 flex-1 flex-col gap-1 leading-tight">
                <span className="line-clamp-2 text-[13px] font-medium group-hover:text-primary">{c.title}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span>
                    <b className="tabular-nums text-foreground">{c.visible}</b> câu
                  </span>
                  {c.added > 0 && <span>· {c.added} câu soạn thêm</span>}
                  {c.hidden > 0 && <span>· {c.hidden} ẩn</span>}
                  {c.reviewed && (
                    <span className="inline-flex items-center gap-0.5 text-primary">
                      · <CircleCheck className="size-3" /> đã duyệt
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <Panel>
        <PanelHeader
          title={`Chương ${chapter.number}. ${chapter.title}`}
          description="Câu gốc lấy từ bộ câu soạn theo giáo trình; sửa hay ẩn câu gốc không đổi file gốc và khôi phục được. Tỷ lệ đúng tính trên các lượt trắc nghiệm ôn tập."
        />
        <QuestionManager subject={subject.id} chapter={chapter.number} questions={data.questions} reviewed={data.reviewed} />
      </Panel>
    </div>
  );
}

export default function QuestionBankPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <AdminHeading
        overline="Nội dung"
        title="Ngân hàng câu hỏi"
        description="Thêm, sửa, ẩn câu trắc nghiệm theo chương. Học viên dùng các câu này khi ôn tập; đề thi chọn câu từ đây."
        actions={
          <Button variant="outline" render={<Link href="/quan-tri/de-thi" />} nativeButton={false}>
            <ClipboardList data-icon="inline-start" />
            Đề thi
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-2xl" />}>
        <Bank searchParams={searchParams} />
      </Suspense>
    </>
  );
}
