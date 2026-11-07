import type { Metadata } from "next";

import { LibraryBrowser } from "@/features/library/components/LibraryBrowser";
import { LibraryHero } from "@/features/library/components/LibraryHero";
import { getLibrary } from "@/features/library/server/catalog";
import { getVideos } from "@/features/video/server/videos";

export const metadata: Metadata = {
  title: "Thư viện tài liệu",
  description: "Giáo trình, văn kiện của Đảng và tài liệu tham khảo các môn lý luận chính trị, đọc trực tuyến.",
};

export default function LibraryPage() {
  const docs = getLibrary();
  return (
    <>
      <LibraryHero docs={docs} videos={getVideos()} tab="tai-lieu" />
      <div className="bg-subtle">
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
          <LibraryBrowser docs={docs} />
        </div>
      </div>
    </>
  );
}
