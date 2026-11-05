import type { Metadata } from "next";
import { Suspense } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
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
  return (
    <SidebarProvider>
      <AdminSidebar fullName={user.fullName} toReview={counts["gan-co"] + counts["danh-gia"]} />
      <SidebarInset className="bg-subtle">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <span className="text-sm font-medium text-muted-foreground">Trang quản trị dành cho giảng viên</span>
          <ThemeToggle className="ml-auto" />
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh">
          <Skeleton className="hidden w-64 rounded-none md:block" />
          <div className="flex-1 p-8">
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
