import "server-only";

import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";

// Mọi dữ liệu học tập (hội thoại, đánh giá, tiến độ, khảo sát) gắn với một mã khách.
// Đã đăng nhập: dùng mã khách của tài khoản, nên học trên máy nào cũng thấy cùng dữ liệu.
// Chưa đăng nhập: mỗi trình duyệt nhận một mã ngẫu nhiên trong cookie httpOnly; xóa cookie thì mất lịch sử,
// dữ liệu trong DB vẫn còn. Khi đăng nhập hoặc đăng ký, dữ liệu của mã này được gộp vào tài khoản (features/auth).

export const VISITOR_COOKIE = "theoryoj_khach";
const ONE_YEAR = 60 * 60 * 24 * 365;
const PATTERN = /^[0-9a-f-]{36}$/;

const valid = (v: string | undefined): v is string => !!v && PATTERN.test(v);

/** Mã khách ẩn danh trong cookie của trình duyệt, không tính tài khoản. */
export async function anonymousVisitorId(): Promise<string | null> {
  const v = (await cookies()).get(VISITOR_COOKIE)?.value;
  return valid(v) ? v : null;
}

/** Mã khách đang dùng. Null nếu chưa đăng nhập và trình duyệt chưa làm gì cần lưu. */
export async function getVisitorId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user ? user.visitorId : anonymousVisitorId();
}

/**
 * Trong Server Action hoặc route handler: lấy mã khách, chưa có thì tạo mới và ghi cookie
 * (hiện chỉ còn phiếu khảo sát cho khách; làm bài, ôn thẻ, hỏi trợ lý cần tài khoản học viên).
 */
export async function ensureVisitorId(): Promise<string> {
  const current = await getVisitorId();
  if (current) return current;
  const id = crypto.randomUUID();
  (await cookies()).set(VISITOR_COOKIE, id, {
    path: "/", maxAge: ONE_YEAR, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  });
  return id;
}
