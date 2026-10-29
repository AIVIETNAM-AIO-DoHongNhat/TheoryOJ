import { getPosts } from "@/features/blog/server/posts";
import { Hero } from "@/features/landing/components/Hero";
import {
  CtaSection, FacultySection, FeaturesSection, LatestPostsSection, MaterialsSection, QuickLinksSection,
} from "@/features/landing/components/Sections";
import { getLibrary } from "@/features/library/server/catalog";

// Trang chủ dạng cổng thông tin: học liệu, thư viện, bài viết; trợ lý là một tính năng trong đó.
export default function HomePage() {
  const library = getLibrary();
  const posts = getPosts();
  const textbook = library.find((d) => d.kind === "giao_trinh");
  const documents = library.filter((d) => d.kind === "van_kien").slice(0, 5);

  const facts = [
    { value: String(textbook?.chapters.length ?? 0).padStart(2, "0"), label: "chương giáo trình" },
    { value: String(library.length).padStart(2, "0"), label: "tài liệu đọc trực tuyến" },
    { value: String(posts.length).padStart(2, "0"), label: "bài viết" },
    { value: "04", label: "chế độ của trợ lý" },
  ];

  return (
    <>
      <Hero facts={facts} />
      <QuickLinksSection />
      <MaterialsSection textbook={textbook} documents={documents} />
      <LatestPostsSection posts={posts.slice(0, 3)} />
      <FeaturesSection />
      <FacultySection />
      <CtaSection />
    </>
  );
}
