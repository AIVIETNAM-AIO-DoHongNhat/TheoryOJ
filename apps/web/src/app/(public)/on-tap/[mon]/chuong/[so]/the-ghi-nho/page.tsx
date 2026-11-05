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
import { FlashcardSession } from "@/features/flashcards/components/FlashcardSession";
import { UserCardList } from "@/features/flashcards/components/UserCardList";
import { buildQueue, cardStatus, NEW_PER_SESSION } from "@/features/flashcards/schedule";
import { getDeck } from "@/features/flashcards/server/deck";
import { getStates, toDTO } from "@/features/flashcards/server/states";
import { getUserCards } from "@/features/flashcards/server/user-cards";
import { docsForChapter } from "@/features/library/server/catalog";
import { readerHref } from "@/features/library/types";
import { reviewCrumbs, reviewHref } from "@/features/review/paths";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

// Mọi chương đều có trang: chương chưa có bộ thẻ vẫn ôn được thẻ học viên tự tạo.
export function generateStaticParams() {
  return ACTIVE_SUBJECTS.flatMap((s) => s.chapters.map((c) => ({ mon: s.id, so: String(c.number) })));
}

type Params = PageProps<"/on-tap/[mon]/chuong/[so]/the-ghi-nho">["params"];

async function load(params: Params) {
  const { mon, so } = await params;
  const subject = getSubject(mon);
  const chapter = subject?.chapters.find((c) => c.number === Number(so));
  if (!subject?.active || !chapter) return null;
  return { subject, chapter, deck: getDeck(subject.id, chapter.number) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  return data ? { title: `Thẻ ghi nhớ chương ${data.chapter.number}` } : {};
}

async function FlashcardPageContent({ params, searchParams }: PageProps<"/on-tap/[mon]/chuong/[so]/the-ghi-nho">) {
  const data = await load(params);
  if (!data) notFound();
  const { subject, chapter, deck } = data;
  // Lượt ôn phụ thuộc lịch ôn của từng người và thời điểm mở trang.
  await connection();
  const user = await getCurrentUser();
  const student = isStudent(user);
  const [all, own] = student
    ? await Promise.all([getStates(user.visitorId, subject.id), getUserCards(user.visitorId, subject.id, chapter.number)])
    : [new Map(), []];
  const deckCards = deck?.cards ?? [];
  // Chương không có bộ thẻ: khách nhận 404, học viên vẫn vào để xem hướng dẫn tạo thẻ.
  if (!deckCards.length && !student) notFound();
  const cards = [...deckCards, ...own];
  const ids = cards.map((c) => c.id);
  const states = new Map(ids.filter((id) => all.has(id)).map((id) => [id, all.get(id)!]));

  const now = new Date();
  const queue = buildQueue(ids, states, now);
  const newTotal = ids.filter((id) => !states.has(id)).length;
  const counts = { moi: 0, "den-han": 0, "dang-hoc": 0, "da-thuoc": 0 };
  for (const id of ids) counts[cardStatus(states.get(id), now)]++;
  const nextDue = [...states.values()].map((s) => s.dueAt).sort((a, b) => a.getTime() - b.getTime())[0];

  const textbook = docsForChapter(subject.id, chapter.number).find((d) => d.kind === "giao_trinh");
  const range = textbook?.chapters.find((c) => c.number === chapter.number);

  return (
    <>
      <PageHeader
        crumbs={reviewCrumbs(subject, chapter.number, "the-ghi-nho")}
        title={
          <>
            <span className="mb-2 block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              Thẻ ghi nhớ chương {chapter.number}
            </span>
            {chapter.title}
          </>
        }
        lead={`${deckCards.length ? `${deckCards.length} thẻ khái niệm và công thức` : "Chương này chưa có bộ thẻ chung"}${own.length ? `, ${own.length} thẻ của tôi` : ""}. Thẻ nhớ tốt được hẹn ôn lại thưa dần, thẻ quên được hỏi lại sớm; mỗi lượt tối đa ${NEW_PER_SESSION} thẻ mới.`}
        actions={
          textbook && range ? (
            <Button variant="outline" className="bg-card" render={<Link href={readerHref(textbook.file, range.from)} />} nativeButton={false}>
              <BookOpen data-icon="inline-start" />
              Đọc lại chương
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          {student && (
            <>
              <Badge variant="outline" className="bg-card">{counts.moi} thẻ mới</Badge>
              <Badge variant="outline" className="bg-card">{counts["den-han"]} đến hạn</Badge>
              <Badge variant="outline" className="bg-card">{counts["dang-hoc"]} đang học</Badge>
              <Badge variant="secondary">{counts["da-thuoc"]} đã thuộc</Badge>
            </>
          )}
          {deck && !deck.reviewed && <Badge variant="outline" className="bg-card">Bộ thẻ đang chờ giảng viên duyệt</Badge>}
        </div>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        {student && !cards.length ? (
          <p className="mx-auto max-w-2xl text-center text-muted-foreground">
            Chưa có thẻ nào. Bôi đen một đoạn trong giáo trình chương {chapter.number} rồi chọn “Tạo thẻ” để tạo thẻ của riêng đồng chí.
          </p>
        ) : student ? (
          <FlashcardSession
            // Chỉ dựng lại lượt ôn khi người học bấm "Học thêm" (đổi ?luot=); các lần làm mới dữ liệu khác giữ nguyên lượt đang ôn.
            key={String((await searchParams).luot ?? "0")}
            subject={subject.id}
            chapter={chapter.number}
            cards={cards}
            queue={queue}
            states={Object.fromEntries([...states].map(([id, s]) => [id, toDTO(s)]))}
            textbook={textbook ? { href: readerHref(textbook.file), pageOffset: textbook.pageOffset } : null}
            remainingNew={Math.max(0, newTotal - NEW_PER_SESSION)}
            nextDue={nextDue?.toISOString() ?? null}
          />
        ) : (
          <StudentGate user={user} next={reviewHref(subject.id, chapter.number, "the-ghi-nho")} action="ôn thẻ ghi nhớ" className="mx-auto max-w-3xl" />
        )}
        {own.length > 0 && (
          <div className="mx-auto mt-12 max-w-2xl">
            <UserCardList cards={own} />
          </div>
        )}
      </div>
    </>
  );
}

export default function FlashcardPage({ params, searchParams }: PageProps<"/on-tap/[mon]/chuong/[so]/the-ghi-nho">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FlashcardPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
