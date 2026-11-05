import type { Metadata } from "next";
import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminScrollArea } from "@/features/admin/components/AdminScrollArea";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { getReviewCounts } from "@/features/admin/server/review";
import { requireTeacher } from "@/lib/auth/session";

// Không đặt tiêu đề ở layout: trang 404 trả cho người không có quyền giữ tiêu đề chung của trang web.
export const metadata: Metadata = {
  robots: { index: false },
};

/** Cả khung chỉ dựng sau khi xác nhận giảng viên, để học viên không thấy cả tên các mục quản trị. */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  const counts = await getReviewCounts();
  const toReview = counts["gan-co"] + counts["danh-gia"];
  return (
    // Khung cao đúng một màn hình: thanh bên và thanh trên đứng yên, chỉ vùng nội dung (AdminScrollArea) cuộn.
    <SidebarProvider className="admin-chrome h-svh">
      <AdminSidebar fullName={user.fullName} toReview={toReview} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-subtle md:peer-data-[variant=inset]:shadow-[0_0_0_1px_rgb(255_255_255/0.04),0_24px_60px_-30px_rgb(0_0_0/0.6)]">
        <AdminTopbar toReview={toReview} />
        <AdminScrollArea>
          <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-8">{children}</div>
        </AdminScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh bg-forest">
          <div className="hidden w-64 md:block" />
          <div className="m-2 flex-1 rounded-xl bg-subtle p-8">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
