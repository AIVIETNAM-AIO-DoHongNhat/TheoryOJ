import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { SUBJECTS } from "@/config/subjects";
import { SubjectCard } from "@/features/learning/components/SubjectCard";
import { getLibrary } from "@/features/library/server/catalog";

export const metadata: Metadata = {
  title: "Học liệu",
  description: "Học liệu các môn lý luận chính trị của Khoa Lý luận chính trị, Học viện An ninh nhân dân.",
};

export default function SubjectsPage() {
  const library = getLibrary();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Học liệu" }]}
        title="Học liệu các môn"
        lead="Các môn lý luận chính trị do Khoa giảng dạy. Mỗi môn có học liệu theo chương, tài liệu trong Thư viện và trợ lý học tập riêng."
      />
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-12 sm:py-16 md:grid-cols-2 lg:grid-cols-3">
        {SUBJECTS.map((s) => (
          <SubjectCard key={s.id} subject={s} docCount={library.filter((d) => d.subject === s.id).length} />
        ))}
      </div>
    </>
  );
}
