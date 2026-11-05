"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ASSISTANT } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { MinhMascot } from "./MinhMascot";
import { ScrollToTop } from "./ScrollToTop";

/** Cụm nút nổi góc phải: Trợ lý học tập ở trên, về đầu trang ở dưới. Trang trợ lý không cần nút mở trợ lý; trang quản trị, đăng nhập, đăng ký không cần cả cụm. */
export function FloatingActions() {
  const pathname = usePathname();
  const onAssistant = pathname.startsWith(ASSISTANT.href);
  // Trang sổ ghi chép (/so-ghi-chep/<id>) dùng hết màn hình để viết, nút nổi sẽ che góc trang giấy.
  if (["/quan-tri", "/dang-nhap", "/dang-ky", "/so-ghi-chep/"].some((p) => pathname.startsWith(p))) return null;

  const label = `Hỏi Minh, ${ASSISTANT.label.toLowerCase()}`;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex [html[data-pdf-reader]_&]:hidden flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {!onAssistant && (
        <Tooltip>
          <TooltipTrigger
            render={
              // Nền trắng viền xanh: thân Minh màu xanh, đặt trên nền xanh sẽ chìm.
              <Button
                render={<Link href={ASSISTANT.href} />}
                nativeButton={false}
                aria-label={label}
                variant="outline"
                size="icon-lg"
                className="size-12 rounded-full border-2 border-primary bg-white p-0 shadow-[0_8px_24px_-8px_rgb(21_128_61/0.6)] transition-[translate] duration-200 hover:-translate-y-0.5 hover:bg-white dark:border-primary dark:bg-white dark:hover:bg-white"
              />
            }
          >
            <MinhMascot compact className="size-9" />
          </TooltipTrigger>
          <TooltipContent side="left">{label}</TooltipContent>
        </Tooltip>
      )}
      <ScrollToTop />
    </div>
  );
}
