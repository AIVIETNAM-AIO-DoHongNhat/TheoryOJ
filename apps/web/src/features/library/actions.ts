"use server";

import { z } from "zod";

import { getCurrentUser, isStudent } from "@/lib/auth/session";

import { getDoc } from "./server/catalog";
import { getReadingPosition, saveReadingPosition } from "./server/reading";

// Thư viện mở cho mọi người; chỉ học viên đã đăng nhập mới được nhớ trang đang đọc. Người khác gọi thì bỏ qua, không báo lỗi.

const Input = z.object({ slug: z.string().max(200), page: z.number().int().min(1).max(5000) });

export async function rememberPage(input: z.input<typeof Input>): Promise<void> {
  const parsed = Input.safeParse(input);
  const user = await getCurrentUser();
  if (!parsed.success || !isStudent(user)) return;
  const doc = getDoc(parsed.data.slug);
  if (!doc || (doc.pages && parsed.data.page > doc.pages)) return;
  await saveReadingPosition(user.visitorId, doc.slug, parsed.data.page);
}

export async function lastPage(slug: string): Promise<number | null> {
  const user = await getCurrentUser();
  if (!isStudent(user) || typeof slug !== "string" || !getDoc(slug)) return null;
  return getReadingPosition(user.visitorId, slug);
}
