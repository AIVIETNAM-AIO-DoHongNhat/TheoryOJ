import { ACTIVE_SUBJECTS, DEFAULT_SUBJECT, SUBJECTS } from "@/config/subjects";
import { getPosts } from "@/features/blog/server/posts";
import {
  AssistantShowcase, BentoSection, CtaPanel, FacultyGallery, HomeHero, LatestPosts,
} from "@/features/landing/components/Home";
import { getUsageStats, MIN_ANSWERS } from "@/features/landing/server/usage";
import { subjectSuggestions } from "@/features/learning/content";
import { getLibrary } from "@/features/library/server/catalog";

// Trang chủ dạng cổng thông tin: học liệu, thư viện, bài viết; trợ lý là một tính năng trong đó.
const num = (n: number) => n.toLocaleString("vi-VN");

export default async function HomePage() {
  const library = getLibrary();
  const posts = getPosts();
  const usage = await getUsageStats();

  // Khi đã có đủ lượt dùng thật thì hàng số liệu chuyển sang số sử dụng, cập nhật theo giờ.
  const facts = usage && usage.answers >= MIN_ANSWERS
    ? [
        { value: num(usage.answers), label: "câu hỏi đã được trả lời" },
        { value: num(usage.practice), label: "lượt làm trắc nghiệm, bài tập" },
        usage.helpful === null
          ? { value: String(library.length).padStart(2, "0"), label: "tài liệu đọc trực tuyến" }
          : { value: `${Math.round(usage.helpful * 100)} %`, label: "đánh giá câu trả lời hữu ích" },
        { value: String(posts.length).padStart(2, "0"), label: "bài viết" },
      ]
    : [
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
