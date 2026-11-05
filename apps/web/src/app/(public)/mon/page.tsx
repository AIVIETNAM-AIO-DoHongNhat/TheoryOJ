import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { SUBJECTS, type Subject } from "@/config/subjects";
import { getPosts } from "@/features/blog/server/posts";
import { SubjectCard } from "@/features/learning/components/SubjectCard";
import { LEARN_STEPS } from "@/features/learning/steps";
import { getLibrary } from "@/features/library/server/catalog";
import { StepGuide } from "@/features/review/components/steps";
import { learnHref } from "@/features/review/paths";

export const metadata: Metadata = {
  title: "Bài học",
  description: "Bài học theo lộ trình chương của các môn lý luận chính trị của Khoa LLCT&KHXHNV, Học viện An ninh nhân dân.",
};

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

export default function SubjectsPage() {
  const library = getLibrary();
  const posts = getPosts();
  const stats = (s: Subject) =>
    s.active
      ? [
          { label: "chương", value: s.chapters.length },
          { label: "tài liệu", value: library.filter((d) => d.subject === s.id).length },
          { label: "bài viết", value: posts.filter((p) => p.subject === s.id).length },
        ]
      : [];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Bài học" }]}
        title="Bài học các môn"
        lead="Nơi bắt đầu học. Mỗi môn có lộ trình theo chương; mỗi chương gồm phần đọc trong giáo trình, câu hỏi để hỏi trợ lý, văn kiện và bài viết liên quan. Học xong một chương thì chuyển sang Ôn tập."
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:py-16">
        <section aria-labelledby="chon-mon" className="flex flex-col gap-6">
          <Heading id="chon-mon" title="Chọn môn để học" lead="Vào một môn để xem lộ trình các chương, rồi chọn chương để bắt đầu học." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((s, i) => (
              <SubjectCard key={s.id} subject={s} index={i + 1} href={learnHref(s.id)} cta="Xem lộ trình" stats={stats(s)} />
            ))}
          </div>
        </section>

        <section id="cach-hoc" aria-labelledby="cach-hoc-title" className="flex scroll-mt-24 flex-col gap-6">
          <Heading
            id="cach-hoc-title"
            title="Cách học một chương"
            lead="Trang của mỗi chương chia đúng bốn phần theo thứ tự này. Học xong chương thì chuyển sang bốn bước ôn ở Ôn tập."
          />
          <StepGuide steps={LEARN_STEPS} />
        </section>
      </div>
    </>
  );
}
