import { ACTIVE_SUBJECTS, DEFAULT_SUBJECT, SUBJECTS } from "@/config/subjects";
import { getPosts } from "@/features/blog/server/posts";
import {
  AssistantShowcase, BentoSection, CtaPanel, FacultyGallery, HomeHero, LatestPosts,
} from "@/features/landing/components/Home";
import { subjectSuggestions } from "@/features/learning/content";
import { getLibrary } from "@/features/library/server/catalog";

// Trang chủ dạng cổng thông tin: học liệu, thư viện, bài viết; trợ lý là một tính năng trong đó.
export default function HomePage() {
  const library = getLibrary();
  const posts = getPosts();

  const facts = [
    { value: `${ACTIVE_SUBJECTS.length}/${SUBJECTS.length}`, label: "môn đã có học liệu" },
    { value: String(library.length).padStart(2, "0"), label: "tài liệu đọc trực tuyến" },
    { value: String(posts.length).padStart(2, "0"), label: "bài viết" },
    { value: "04", label: "chế độ của trợ lý" },
  ];

  return (
    <>
      <HomeHero facts={facts} suggestions={(subjectSuggestions[DEFAULT_SUBJECT] ?? []).slice(0, 3)} />
      <BentoSection library={library} postCount={posts.length} />
      <AssistantShowcase />
      <LatestPosts posts={posts.slice(0, 3)} />
      <FacultyGallery />
      <CtaPanel />
    </>
  );
}
