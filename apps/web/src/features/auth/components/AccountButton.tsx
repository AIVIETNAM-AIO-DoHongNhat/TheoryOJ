import { getCurrentUser } from "@/lib/auth/session";

import { SignInButton, UserMenu } from "./UserMenu";

/** Góc phải đầu trang: nút Đăng nhập, hoặc menu tài khoản khi đã đăng nhập. Đặt trong Suspense vì đọc cookie. */
export async function AccountButton() {
  const user = await getCurrentUser();
  return user ? (
    <UserMenu fullName={user.fullName} studentCode={user.studentCode} classroom={user.className} teacher={user.role === "giang-vien"} />
  ) : <SignInButton />;
}
