import { LayoutDashboard, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { CurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Thay cho khung làm bài khi người xem không phải học viên đã đăng nhập. Khách được mời đăng nhập rồi quay lại đúng trang;
 * giảng viên được báo vì sao không làm bài (kết quả không lẫn vào số liệu học viên).
 */
export function StudentGate({ user, next, action, className }: { user: CurrentUser | null; next: string; action: string; className?: string }) {
  const teacher = user?.role === "giang-vien";
  const q = `?tiep=${encodeURIComponent(next)}`;
  return (
    <Empty className={cn("border border-solid bg-card py-14", className)}>
      <EmptyHeader className="max-w-md">
        <EmptyMedia className="size-14 rounded-2xl bg-primary-soft text-primary [&_svg:not([class*='size-'])]:size-6">
          <LockKeyhole />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-bold">
          {teacher ? "Tài khoản giảng viên không làm bài" : `Đăng nhập để ${action}`}
        </EmptyTitle>
        <EmptyDescription>
          {teacher
            ? "Kết quả làm bài chỉ lưu cho tài khoản học viên, để số liệu ở trang quản trị không lẫn lượt làm của giảng viên. Muốn thử như học viên, hãy đăng xuất và đăng nhập bằng một tài khoản học viên."
            : "Khách chỉ xem được nội dung. Mỗi lượt làm bài được lưu vào đúng tài khoản học viên của đồng chí để theo dõi tiến độ và để giảng viên nắm tình hình lớp."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        {teacher ? (
          <Button render={<Link href="/quan-tri" />} nativeButton={false}>
            <LayoutDashboard data-icon="inline-start" />
            Về trang quản trị
          </Button>
        ) : (
          <>
            <Button render={<Link href={`/dang-nhap${q}`} />} nativeButton={false}>
              <LogIn data-icon="inline-start" />
              Đăng nhập
            </Button>
            <Button variant="outline" render={<Link href={`/dang-ky${q}`} />} nativeButton={false}>
              <UserPlus data-icon="inline-start" />
              Tạo tài khoản
            </Button>
          </>
        )}
      </EmptyContent>
    </Empty>
  );
}
