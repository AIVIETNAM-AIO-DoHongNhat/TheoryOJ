import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { LibraryBrowser } from "@/features/library/components/LibraryBrowser";
import { getLibrary } from "@/features/library/server/catalog";

export const metadata: Metadata = {
  title: "Thư viện tài liệu",
  description: "Giáo trình, văn kiện của Đảng và tài liệu tham khảo các môn lý luận chính trị, đọc trực tuyến.",
};

export default function LibraryPage() {
  const docs = getLibrary();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Thư viện" }]}
        title="Thư viện tài liệu"
        lead="Giáo trình, văn kiện của Đảng và tài liệu tham khảo được trợ lý dùng để trả lời. Đọc trực tuyến hoặc tải về để học."
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <LibraryBrowser docs={docs} />
      </div>
    </>
  );
}
