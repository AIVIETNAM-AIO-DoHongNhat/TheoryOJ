import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PostCard } from "@/features/blog/components/PostCard";
import { getPosts } from "@/features/blog/server/posts";

export const metadata: Metadata = {
  title: "Bài viết",
  description: "Bài hướng dẫn, ôn tập và giới thiệu văn kiện của Khoa Lý luận chính trị.",
};

export default function PostsPage() {
  const [first, ...rest] = getPosts();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Bài viết" }]}
        title="Bài viết"
        lead="Hướng dẫn sử dụng, bài ôn tập theo chương và giới thiệu văn kiện do giảng viên Khoa biên soạn."
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:py-16">
        {!first ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyTitle>Chưa có bài viết</EmptyTitle>
              <EmptyDescription>Bài viết mới sẽ được đăng tại đây.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <PostCard post={first} featured />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
