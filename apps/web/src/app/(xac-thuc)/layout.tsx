import { AuthShell } from "@/features/auth/components/AuthPage";

/** Khung chung của đăng nhập, đăng ký. Đặt ở layout để giữ nguyên ảnh bên phải khi chuyển qua lại giữa hai trang. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthShell>{children}</AuthShell>;
}
