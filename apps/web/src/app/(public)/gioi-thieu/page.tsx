import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AboutSection, FaqSection, PrinciplesSection } from "@/features/landing/components/Sections";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Mục đích, nguyên tắc hoạt động và câu hỏi thường gặp về trang học tập của Khoa Lý luận chính trị.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Giới thiệu" }]}
        title="Giới thiệu"
        lead="Trang học tập trực tuyến các môn lý luận chính trị của Khoa Lý luận chính trị, Học viện An ninh nhân dân."
      />
      <AboutSection />
      <PrinciplesSection />
      <FaqSection />
    </>
  );
}
