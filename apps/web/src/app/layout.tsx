import type { Metadata } from "next";
import { JetBrains_Mono, Roboto, Roboto_Condensed } from "next/font/google";
import "./globals.css";

import { FloatingActions } from "@/components/brand/FloatingActions";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    "Trợ lý học tập môn Kinh tế chính trị Mác – Lênin của Khoa Lý luận chính trị, Học viện An ninh nhân dân. " +
    "Trả lời dựa trên giáo trình và văn kiện, trích nguồn đến số trang.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={cn("h-full antialiased", sans.variable, heading.variable, mono.variable)}>
      <body className="flex min-h-full flex-col">
        <noscript>
          <style>{".reveal{opacity:1;transform:none}"}</style>
        </noscript>
        <TooltipProvider>
          {children}
          <FloatingActions />
        </TooltipProvider>
      </body>
    </html>
  );
}
