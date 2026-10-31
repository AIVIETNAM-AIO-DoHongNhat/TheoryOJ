import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACTIVE_SUBJECTS, getSubject } from "@/config/subjects";
import { docsForChapter } from "@/features/library/server/catalog";
import { readerHref } from "@/features/library/types";
import { QuizRunner } from "@/features/quiz/components/QuizRunner";
import { drawQuiz, getQuizBank } from "@/features/quiz/server/bank";
import { QUIZ_SIZE } from "@/features/quiz/types";

export function generateStaticParams() {
  return ACTIVE_SUBJECTS.flatMap((s) =>
    s.chapters.filter((c) => getQuizBank(s.id, c.number)?.questions.length).map((c) => ({ mon: s.id, so: String(c.number) })),
  );
}

type Params = PageProps<"/mon/[mon]/chuong/[so]/trac-nghiem">["params"];

async function load(params: Params) {
  const { mon, so } = await params;
  const subject = getSubject(mon);
  const chapter = subject?.chapters.find((c) => c.number === Number(so));
  const bank = subject?.active && chapter ? getQuizBank(subject.id, chapter.number) : null;
  return subject && chapter && bank?.questions.length ? { subject, chapter, bank } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  return data ? { title: `Trắc nghiệm chương ${data.chapter.number}` } : {};
}

async function QuizPageContent({ params }: { params: Params }) {
  const data = await load(params);
  if (!data) notFound();
  const { subject, chapter, bank } = data;
  // Mỗi lần mở trang là một đề mới, nên trang không sinh tĩnh.
  await connection();
  const questions = drawQuiz(bank);
  const textbook = docsForChapter(subject.id, chapter.number).find((d) => d.kind === "giao_trinh");
  const range = textbook?.chapters.find((c) => c.number === chapter.number);

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Học liệu", href: "/mon" },
          { label: subject.shortName, href: `/mon/${subject.id}` },
          { label: `Chương ${chapter.number}`, href: `/mon/${subject.id}/chuong/${chapter.number}` },
          { label: "Trắc nghiệm" },
        ]}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Trắc nghiệm chương {chapter.number}
            </span>
            {chapter.title}
          </>
        }
        lead={`Mỗi đề gồm ${Math.min(QUIZ_SIZE, bank.questions.length)} câu lấy ngẫu nhiên trong ${bank.questions.length} câu của chương. Nộp bài để xem đáp án, giải thích và trang giáo trình tương ứng.`}
        actions={
          textbook && range ? (
            <Button variant="outline" className="bg-white" render={<Link href={readerHref(textbook.file, range.from)} />} nativeButton={false}>
              <BookOpen data-icon="inline-start" />
              Đọc lại chương
            </Button>
          ) : undefined
        }
      >
        {!bank.reviewed && <Badge variant="outline" className="self-start bg-white">Bộ câu hỏi đang chờ giảng viên duyệt</Badge>}
      </PageHeader>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <QuizRunner
          subject={subject.id}
          chapter={chapter.number}
          initialQuestions={questions}
          textbook={textbook ? { href: readerHref(textbook.file), pageOffset: textbook.pageOffset } : null}
        />
      </div>
    </>
  );
}

export default function QuizPage({ params }: PageProps<"/mon/[mon]/chuong/[so]/trac-nghiem">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuizPageContent params={params} />
    </Suspense>
  );
}
