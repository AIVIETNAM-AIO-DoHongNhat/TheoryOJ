import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * Chặn ở tầng định tuyến: vào /quan-tri mà không có cookie phiên thì trả ngay trang 404 (mã 404 thật), như một đường dẫn
 * không tồn tại, không chuyển sang trang đăng nhập để khỏi lộ là trang quản trị có thật.
 *
 * Proxy chỉ xem có cookie hay không, không đọc DB. Phiên hết hạn hoặc tài khoản học viên vẫn đi tiếp và bị
 * requireTeacher (lib/auth/session.ts) trả notFound() trong trang; Server Action cũng tự gọi requireTeacher.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  // Viết lại sang một đường dẫn không có route: Next.js dựng app/not-found.tsx với mã 404, URL trên thanh địa chỉ giữ nguyên.
  return NextResponse.rewrite(new URL("/_khong-tim-thay", request.url));
}

export const config = {
  matcher: ["/quan-tri", "/quan-tri/:path*"],
};
