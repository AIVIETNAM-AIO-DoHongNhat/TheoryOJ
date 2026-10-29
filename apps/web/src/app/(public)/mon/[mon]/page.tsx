import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSubject, SUBJECTS } from "@/config/subjects";
import { getLibrary } from "@/features/library/server/catalog";
import { printedPage } from "@/features/library/types";

export function generateStaticParams() {
  return SUBJECTS.filter((s) => s.active).map((s) => ({ mon: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/mon/[mon]">): Promise<Metadata> {
  const subject = getSubject((await params).mon);
  return subject ? { title: `Học liệu ${subject.name}` } : {};
}

async function SubjectPageContent({ params }: PageProps<"/mon/[mon]">) {
  const subject = getSubject((await params).mon);
  if (!subject?.active) notFound();
  const textbook = getLibrary().find((d) => d.subject === subject.id && d.kind === "giao_trinh");

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Học liệu" }, { label: subject.name }]}
        title={subject.name}
        lead="Mỗi chương gồm phần đọc trong giáo trình, văn kiện liên quan, bài viết ôn tập và câu hỏi gợi ý để hỏi trợ lý."
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Card className="gap-0 py-0">
          {subject.chapters.map((c, i) => {
            const range = textbook?.chapters.find((x) => x.number === c.number);
            return (
              <div key={c.number}>
                {i > 0 && <Separator />}
                <Link href={`/mon/${subject.id}/chuong/${c.number}`} className="group flex items-center gap-5 px-5 py-5 transition-colors hover:bg-primary-soft sm:px-7">
                  <span className="w-10 shrink-0 font-heading text-2xl font-bold text-primary">{String(c.number).padStart(2, "0")}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base font-medium leading-snug group-hover:text-primary">{c.title}</span>
                    {range && textbook && (
                      <span className="text-sm text-muted-foreground">
                        Giáo trình, tr. {printedPage(textbook, range.from)}–{printedPage(textbook, range.to)}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}

// Đọc params trong Suspense để khung trang dùng chung cho mọi đường dẫn (Partial Prefetching).
export default function SubjectPage(props: PageProps<"/mon/[mon]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SubjectPageContent {...props} />
    </Suspense>
  );
}
