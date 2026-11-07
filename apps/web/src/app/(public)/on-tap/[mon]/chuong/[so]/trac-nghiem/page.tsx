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
import { StudentGate } from "@/features/auth/components/StudentGate";
import { getDeck } from "@/features/flashcards/server/deck";
import { docsForChapter } from "@/features/library/server/catalog";
import { readerHref } from "@/features/library/types";
import { QuizRunner } from "@/features/quiz/components/QuizRunner";
import { getQuizBank, quizCounts } from "@/features/quiz/server/bank";
import { issueQuiz } from "@/features/quiz/server/draws";
import { QUIZ_SIZE } from "@/features/quiz/types";
import { reviewCrumbs, reviewHref } from "@/features/review/paths";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

export async function generateStaticParams() {
  const params = await Promise.all(
    ACTIVE_SUBJECTS.map(async (s) => {
      const counts = await quizCounts(s.id, s.chapters.map((c) => c.number));
      return s.chapters.filter((c) => counts[c.number]).map((c) => ({ mon: s.id, so: String(c.number) }));
    }),
  );
  return params.flat();
}

type Params = PageProps<"/on-tap/[mon]/chuong/[so]/trac-nghiem">["params"];

async function load(params: Params) {
  const { mon, so } = await params;
  const subject = getSubject(mon);
  const chapter = subject?.chapters.find((c) => c.number === Number(so));
  const bank = subject?.active && chapter ? await getQuizBank(subject.id, chapter.number) : null;
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
  // Khách và giảng viên chỉ xem phần giới thiệu, không nhận đề. Đề được ghi lại để lúc nộp máy chủ chỉ chấm đúng các câu này.
  const user = await getCurrentUser();
  const quiz = isStudent(user) ? await issueQuiz(user.visitorId, bank) : null;
  const textbook = docsForChapter(subject.id, chapter.number).find((d) => d.kind === "giao_trinh");
  const range = textbook?.chapters.find((c) => c.number === chapter.number);

  return (
    <>
      <PageHeader
        crumbs={reviewCrumbs(subject, chapter.number, "trac-nghiem")}
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
            <Button variant="outline" className="bg-card" render={<Link href={readerHref(textbook.file, range.from)} />} nativeButton={false}>
              <BookOpen data-icon="inline-start" />
              Đọc lại chương
            </Button>
          ) : undefined
        }
      >
        {!bank.reviewed && <Badge variant="outline" className="self-start bg-card">Bộ câu hỏi đang chờ giảng viên duyệt</Badge>}
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        {quiz ? (
          <QuizRunner
            subject={subject.id}
            chapter={chapter.number}
            initialDrawId={quiz.drawId}
            initialQuestions={quiz.questions}
            textbook={textbook ? { href: readerHref(textbook.file), pageOffset: textbook.pageOffset } : null}
            flashcardsHref={getDeck(subject.id, chapter.number)?.cards.length ? reviewHref(subject.id, chapter.number, "the-ghi-nho") : null}
          />
        ) : (
          <StudentGate user={user} next={reviewHref(subject.id, chapter.number, "trac-nghiem")} action="làm trắc nghiệm" className="mx-auto max-w-3xl" />
        )}
      </div>
    </>
  );
}

export default function QuizPage({ params }: PageProps<"/on-tap/[mon]/chuong/[so]/trac-nghiem">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuizPageContent params={params} />
    </Suspense>
  );
}
