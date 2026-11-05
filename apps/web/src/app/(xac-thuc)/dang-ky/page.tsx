import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/components/AuthForms";
import { AuthPage } from "@/features/auth/components/AuthPage";
import { homeFor, safeNext } from "@/features/auth/schemas";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Đăng ký", robots: { index: false } };

async function Register({ searchParams }: PageProps<"/dang-ky">) {
  const { tiep } = await searchParams;
  const next = safeNext(tiep);
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role, tiep));
  return <RegisterForm next={next} />;
}

export default function RegisterPage(props: PageProps<"/dang-ky">) {
  return (
    <AuthPage
      title={<>Tạo <span className="text-primary">tài khoản</span></>}
      description="Dùng mã học viên để làm bài, ôn thẻ, hỏi trợ lý và theo dõi tiến độ trên mọi máy."
      wide
    >
      <Register {...props} />
    </AuthPage>
  );
}
