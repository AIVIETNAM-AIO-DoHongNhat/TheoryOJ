"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { ScrollToTop } from "@/components/brand/ScrollToTop";

/**
 * Vùng nội dung của trang quản trị. Khung quản trị cao đúng một màn hình, chỉ vùng này cuộn, nên thanh trên (AdminTopbar)
 * đứng yên hẳn thay vì trôi theo tấm nền bo góc. Sang trang khác thì về đầu vùng cuộn (cửa sổ không cuộn nên
 * Next.js không tự làm). Góc phải dưới có nút về đầu trang.
 */
export function AdminScrollArea({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className="absolute inset-0 overflow-y-auto overscroll-contain">
        {children}
      </div>
      <div className="pointer-events-none absolute right-5 bottom-5 z-10 flex flex-col items-end sm:right-8 sm:bottom-8 [&>*]:pointer-events-auto">
        <ScrollToTop target={ref} />
      </div>
    </div>
  );
}
