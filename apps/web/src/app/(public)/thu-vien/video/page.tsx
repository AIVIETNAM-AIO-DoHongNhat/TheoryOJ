import type { Metadata } from "next";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { LibraryHero } from "@/features/library/components/LibraryHero";
import { getLibrary } from "@/features/library/server/catalog";
import { VideoBrowser } from "@/features/video/components/VideoBrowser";
import { getVideos } from "@/features/video/server/videos";

export const metadata: Metadata = {
  title: "Video bài giảng và tư liệu",
  description: "Bài giảng, video minh họa và phim tư liệu các môn lý luận chính trị của Khoa LLCT&KHXHNV.",
};

/** Tab Video của Thư viện: cùng hero với tab Tài liệu, thanh lọc nổi lên mép dưới hero. */
export default function LibraryVideosPage() {
  const videos = getVideos();
  return (
    <>
      <LibraryHero docs={getLibrary()} videos={videos} tab="video" />
      <div className="bg-subtle">
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
          {videos.length === 0 ? (
            <Empty className="relative z-20 -mt-12 rounded-2xl border bg-card py-16 shadow-float sm:-mt-14">
              <EmptyHeader>
                <EmptyTitle>Chưa có video</EmptyTitle>
                <EmptyDescription>Bài giảng, video minh họa và phim tư liệu sẽ được đăng tại đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <VideoBrowser videos={videos} />
          )}
        </div>
      </div>
    </>
  );
}
