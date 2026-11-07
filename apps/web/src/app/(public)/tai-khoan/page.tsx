import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordForm, ProfileForm } from "@/features/auth/components/AuthForms";
import { LogoutButton } from "@/features/auth/components/UserMenu";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tài khoản", robots: { index: false } };

async function Account() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?tiep=/tai-khoan");
  return (
    <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-12 sm:py-16 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin học viên</CardTitle>
          <CardDescription>
            Mã học viên <span className="font-medium text-foreground">{user.studentCode}</span>, dùng để đăng nhập.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={user.fullName} className={user.className} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
          <CardDescription>Quên mật khẩu thì liên hệ giảng viên để được đặt lại.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Tài khoản" }]}
        title="Tài khoản"
        lead="Tiến độ ôn tập, lịch sử hỏi trợ lý và phiếu khảo sát được lưu theo tài khoản này."
        actions={
          <LogoutButton />
        }
      />
      <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12"><Skeleton className="h-80 rounded-xl" /></div>}>
        <Account />
      </Suspense>
    </>
  );
}
