import type { Metadata } from "next";

import { Illustration, NotFound } from "@/components/ui/not-found";

// Trang 404 chung: đường dẫn không tồn tại, và cả trang người xem không có quyền mở (trang quản trị trả 404 thay vì
// báo "cấm truy cập", để không lộ là trang đó tồn tại). Vì vậy lời văn không nói "không có quyền".
// Dựng tĩnh, không đọc phiên đăng nhập; nằm ngay dưới layout gốc nên không có đầu trang, chân trang chung.

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false },
};

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-svh w-full flex-1 flex-col justify-center overflow-hidden bg-background p-6 md:p-10">
      <div className="relative mx-auto w-full max-w-5xl">
        {/* Hai lớp: lớp ngoài trôi nhẹ, lớp trong hiện dần (hai hiệu ứng trên cùng một phần tử sẽ ghi đè nhau). */}
        <div aria-hidden className="absolute inset-0 motion-safe:animate-float">
          <Illustration className="animate-fade-in h-[50vh] w-full text-foreground opacity-[0.04] dark:opacity-[0.03]" />
        </div>
        <NotFound
          title="Không tìm thấy trang"
          description="Đường dẫn có thể đã thay đổi hoặc không còn tồn tại."
        />
      </div>
    </main>
  );
}
