import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

import { homeFor } from "../schemas";

/**
 * Đặt trong trang đăng nhập, đăng ký, bọc Suspense với fallback null: đã đăng nhập thì chuyển về trang của mình.
 * Không vẽ gì, nên form bên cạnh hiện ngay từ khung tĩnh mà không bị đẩy, nhảy khi phần này xong.
 */
export async function RedirectIfSignedIn({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ tiep }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect(homeFor(user.role, tiep));
  return null;
}
