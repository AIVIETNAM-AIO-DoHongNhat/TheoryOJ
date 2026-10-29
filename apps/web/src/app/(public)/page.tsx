import { ACTIVE_SUBJECTS, SUBJECTS } from "@/config/subjects";
import { getPosts } from "@/features/blog/server/posts";
import { Hero } from "@/features/landing/components/Hero";
import {
  CtaSection, FacultySection, FeaturesSection, LatestPostsSection, QuickLinksSection, SubjectsSection,
} from "@/features/landing/components/Sections";
import { getLibrary } from "@/features/library/server/catalog";

// Trang chủ dạng cổng thông tin: học liệu, thư viện, bài viết; trợ lý là một tính năng trong đó.
export default function HomePage() {
  const library = getLibrary();
  const posts = getPosts();
  const docCounts = Object.fromEntries(SUBJECTS.map((sub) => [sub.id, library.filter((d) => d.subject === sub.id).length]));

  const facts = [
    { value: `${ACTIVE_SUBJECTS.length}/${SUBJECTS.length}`, label: "môn đã có học liệu" },
    { value: String(library.length).padStart(2, "0"), label: "tài liệu đọc trực tuyến" },
    { value: String(posts.length).padStart(2, "0"), label: "bài viết" },
    { value: "04", label: "chế độ của trợ lý" },
  ];

  return (
    <>
      <Hero facts={facts} />
      <QuickLinksSection />
      <SubjectsSection docCounts={docCounts} />
      <LatestPostsSection posts={posts.slice(0, 3)} />
      <FeaturesSection />
      <FacultySection />
      <CtaSection />
    </>
  );
}
