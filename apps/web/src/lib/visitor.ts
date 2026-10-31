import "server-only";

import { cookies } from "next/headers";

// Trợ lý không cần đăng nhập. Mỗi trình duyệt nhận một mã khách ngẫu nhiên trong cookie httpOnly,
// dùng để giữ lịch sử hội thoại, chỉ cho người tạo xem lại hội thoại, và giới hạn tần suất.
// Xóa cookie thì mất lịch sử; dữ liệu trong DB vẫn còn để giảng viên xem lại.

export const VISITOR_COOKIE = "theoryoj_khach";
const ONE_YEAR = 60 * 60 * 24 * 365;
const PATTERN = /^[0-9a-f-]{36}$/;

const valid = (v: string | undefined): v is string => !!v && PATTERN.test(v);

/** Đọc mã khách trong Server Component hoặc Server Action. Null nếu trình duyệt chưa hỏi lần nào. */
export async function getVisitorId(): Promise<string | null> {
  const v = (await cookies()).get(VISITOR_COOKIE)?.value;
  return valid(v) ? v : null;
}

/** Trong Server Action: lấy mã khách, chưa có thì tạo mới và ghi cookie (trắc nghiệm, bài tập làm trước khi hỏi trợ lý). */
export async function ensureVisitorId(): Promise<string> {
  const store = await cookies();
  const v = store.get(VISITOR_COOKIE)?.value;
  if (valid(v)) return v;
  const id = crypto.randomUUID();
  store.set(VISITOR_COOKIE, id, {
    path: "/", maxAge: ONE_YEAR, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  });
  return id;
}

/** Trong route handler: lấy mã khách từ request, hoặc tạo mới kèm header Set-Cookie để trả về. */
export function visitorFromRequest(req: Request): { id: string; setCookie?: string } {
  const raw = req.headers.get("cookie") ?? "";
  const v = raw.split(/;\s*/).find((c) => c.startsWith(`${VISITOR_COOKIE}=`))?.slice(VISITOR_COOKIE.length + 1);
  if (valid(v)) return { id: v };
  const id = crypto.randomUUID();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return { id, setCookie: `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax${secure}` };
}
