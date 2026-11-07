import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterForm } from "@/features/auth/components/AuthForms";
import { AuthPage } from "@/features/auth/components/AuthPage";
import { RedirectIfSignedIn } from "@/features/auth/components/RedirectIfSignedIn";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Đăng ký", robots: { index: false } };

// Như trang đăng nhập: form trong khung tĩnh, phần chuyển hướng khi đã đăng nhập chạy riêng.
export default function RegisterPage({ searchParams }: PageProps<"/dang-ky">) {
  return (
    <AuthPage
      title={<>Tạo <span className="text-primary">tài khoản</span></>}
      description="Dùng mã học viên để làm bài, ôn thẻ, hỏi trợ lý và theo dõi tiến độ trên mọi máy."
      wide
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
      <RegisterForm open={env.REGISTRATION_OPEN} />
    </AuthPage>
  );
}
