import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  AboutSection, FacultySection, FaqSection, PrinciplesSection, TeamSection,
} from "@/features/landing/components/Sections";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Mục đích, nguyên tắc hoạt động, giới thiệu Khoa LLCT&KHXHNV và nhóm thực hiện trang học tập.",
};

const TOC = [
  { href: "#gioi-thieu", label: "Về TheoryOJ" },
  { href: "#nguyen-tac", label: "Nguyên tắc" },
  { href: "#ve-khoa", label: "Về Khoa" },
  { href: "#nhom-thuc-hien", label: "Nhóm thực hiện" },
  { href: "#hoi-dap", label: "Hỏi đáp" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Giới thiệu" }]}
        title="Giới thiệu"
        lead="Trang học tập trực tuyến các môn lý luận chính trị của Khoa LLCT&KHXHNV, Học viện An ninh nhân dân."
      >
        <nav aria-label="Mục lục trang" className="flex flex-wrap gap-2">
          {TOC.map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {t.label}
            </a>
          ))}
        </nav>
      </PageHeader>
      <AboutSection />
      <PrinciplesSection />
      <FacultySection />
      <TeamSection />
      <FaqSection />
    </>
  );
}
