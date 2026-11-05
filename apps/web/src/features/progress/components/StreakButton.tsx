import { connection } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

import { getStreak } from "../server/today";
import { StreakMenu } from "./StreakMenu";

/** Ngọn lửa chuỗi ngày học ở đầu trang, chỉ cho học viên đã đăng nhập. Đặt trong Suspense vì đọc cookie. */
export async function StreakButton() {
  const user = await getCurrentUser();
  if (!user || user.role === "giang-vien") return null;
  await connection();
  return <StreakMenu initial={await getStreak(user.visitorId)} />;
}
