import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/AuthForms";
import { AuthPage } from "@/features/auth/components/AuthPage";
import { RedirectIfSignedIn } from "@/features/auth/components/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

// Form nằm trong khung tĩnh nên hiện ngay khi bấm "Đăng nhập"; phần đọc cookie để chuyển hướng chạy riêng, không vẽ gì.
export default function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  return (
    <AuthPage
      title={<>Chào mừng <span className="text-primary">trở lại</span></>}
      description="Tiến độ ôn tập và lịch sử hỏi trợ lý đi theo đồng chí trên mọi thiết bị."
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthPage>
  );
}
