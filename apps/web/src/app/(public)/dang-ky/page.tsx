import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/components/AuthForms";
import { AuthPage } from "@/features/auth/components/AuthPage";
import { safeNext } from "@/features/auth/schemas";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Đăng ký", robots: { index: false } };

async function Register({ searchParams }: PageProps<"/dang-ky">) {
  const next = safeNext((await searchParams).tiep);
  if (await getCurrentUser()) redirect(next);
  return <RegisterForm next={next} />;
}

export default function RegisterPage(props: PageProps<"/dang-ky">) {
  return (
    <AuthPage
      title="Đăng ký tài khoản"
      description="Những gì đã làm trên trình duyệt này được chuyển vào tài khoản mới."
      wide
    >
      <Register {...props} />
    </AuthPage>
  );
}
