import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SUBJECTS, type Subject } from "@/config/subjects";
import { deckCounts } from "@/features/flashcards/server/deck";
import { SubjectCard } from "@/features/learning/components/SubjectCard";
import { quizCounts } from "@/features/quiz/server/bank";
import { ReviewMethod } from "@/features/review/components/steps";
import { reviewHref } from "@/features/review/paths";

export const metadata: Metadata = {
  title: "Ôn tập",
  description: "Thẻ ghi nhớ, trắc nghiệm theo chương, bài tập tính toán sinh số và ôn thi với trợ lý, sắp theo từng môn.",
};

const sum = (r: Record<number, number>) => Object.values(r).reduce((a, b) => a + b, 0);

function Heading({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 id={id} className="text-2xl font-bold">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{lead}</p>
    </div>
  );
}

/** Số liệu ôn tập của một môn cho thẻ chọn môn. */
async function reviewStats(subject: Subject) {
  if (!subject.active) return [];
  const numbers = subject.chapters.map((c) => c.number);
  return [
    { label: "chương", value: subject.chapters.length },
    { label: "thẻ ghi nhớ", value: sum(deckCounts(subject.id, numbers)) },
    { label: "câu hỏi", value: sum(await quizCounts(subject.id, numbers)) },
  ];
}

export default async function OnTapPage() {
  const stats = await Promise.all(SUBJECTS.map(reviewStats));
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ôn tập" }]}
        title="Ôn tập các môn"
        lead="Chọn môn, rồi ôn từng chương theo bốn bước: ghi nhớ, kiểm tra, vận dụng và ôn thi với trợ lý. Kết quả từng lượt được lưu vào bảng tiến độ."
        actions={
          <Button variant="outline" className="bg-card" render={<Link href="/tien-do" />} nativeButton={false}>
            <ChartColumn data-icon="inline-start" />
            Tiến độ của tôi
          </Button>
        }
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:py-16">
        <section aria-labelledby="chon-mon" className="flex flex-col gap-6">
          <Heading id="chon-mon" title="Chọn môn để ôn" lead="Vào một môn để thấy toàn bộ chương và bốn bước ôn của từng chương." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((s, i) => (
              <SubjectCard key={s.id} subject={s} index={i + 1} href={reviewHref(s.id)} cta="Vào ôn tập" stats={stats[i]} />
            ))}
          </div>
        </section>

        <section id="cach-on" aria-labelledby="cach-on-title" className="flex scroll-mt-24 flex-col gap-6">
          <Heading
            id="cach-on-title"
            title="Cách ôn một chương"
            lead="Đi lần lượt bốn bước, từ thuộc kiến thức tới vận dụng và trình bày. Trong trang ôn của mỗi môn, từng chương có hàng bước đánh số đúng thứ tự này; bước nào chương chưa có thì hiện nhạt."
          />
          <ReviewMethod />
        </section>
      </div>
    </>
  );
}
