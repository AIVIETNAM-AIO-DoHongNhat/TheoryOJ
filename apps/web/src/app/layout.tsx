import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Serif, Roboto, Roboto_Condensed } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";

import { FloatingActions } from "@/components/brand/FloatingActions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthTransitionHost } from "@/features/auth/components/AuthTransition";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { cn } from "@/lib/utils";

// Nội dung: Roboto, nét thẳng, chắc; quen thuộc trên các cổng thông tin cơ quan nhà nước.
const sans = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// Tiêu đề: Roboto Condensed đậm, chữ đứng, khổ hẹp, tạo cảm giác cứng cáp, kỷ luật.
const heading = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

// Chữ có chân cho chế độ đọc. Không tải trước: trình duyệt chỉ tải khi người đọc chọn kiểu chữ này.
const serif = Noto_Serif({
  variable: "--font-serif-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
  preload: false,
});

const mono = JetBrains_Mono({
  variable: "--font-mono-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "TheoryOJ – Trợ lý học tập Lý luận chính trị",
    template: "%s | TheoryOJ",
  },
  description:
    "Trang học tập các môn lý luận chính trị của Khoa LLCT&KHXHNV, Học viện An ninh nhân dân: " +
    "thư viện giáo trình và văn kiện, bài học theo chương, bài viết và trợ lý học tập có trích dẫn đến số trang.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Script giao diện đổi lớp của <html> trước khi React nhận trang, nên bỏ qua cảnh báo lệch thuộc tính ở thẻ này.
    <html lang="vi" suppressHydrationWarning className={cn("h-full antialiased", sans.variable, heading.variable, serif.variable, mono.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <noscript>
          <style>{".reveal{opacity:1;transform:none}.reveal .reveal-mask{clip-path:none}.reveal .reveal-zoom{transform:none}"}</style>
        </noscript>
        <TooltipProvider>
          {children}
          {/* Cụm nút đọc đường dẫn hiện tại; đặt trong Suspense để route động không phải chờ khi dựng sẵn. */}
          <Suspense fallback={null}>
            <FloatingActions />
          </Suspense>
          {/* Màn chào mừng sau đăng nhập, tạm biệt khi đăng xuất; nằm ở gốc để không bị gỡ khi trang đổi trạng thái phiên. */}
          <AuthTransitionHost />
        </TooltipProvider>
      </body>
    </html>
  );
}
