import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/AuthForms";
import { AuthPage } from "@/features/auth/components/AuthPage";
import { safeNext } from "@/features/auth/schemas";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

async function Login({ searchParams }: PageProps<"/dang-nhap">) {
  const next = safeNext((await searchParams).tiep);
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}

export default function LoginPage(props: PageProps<"/dang-nhap">) {
  return (
    <AuthPage
      title="Đăng nhập"
      description="Tiến độ ôn tập và lịch sử hỏi trợ lý đi theo đồng chí trên mọi thiết bị."
    >
      <Login {...props} />
    </AuthPage>
  );
}
