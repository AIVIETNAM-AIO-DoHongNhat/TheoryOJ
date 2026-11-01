import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";

import { db } from "@/lib/db";
import { feedback, messages, practiceAttempts } from "@/lib/db/schema";

/** Dưới mức này trang chủ giữ số liệu tĩnh, tránh khoe con số quá nhỏ khi mới triển khai. */
export const MIN_ANSWERS = 100;
/** Cần đủ lượt đánh giá thì tỷ lệ hữu ích mới có nghĩa. */
const MIN_RATINGS = 20;

export interface UsageStats {
  answers: number;
  practice: number;
  /** Tỷ lệ 👍 trên tổng lượt đánh giá, null khi chưa đủ lượt. */
  helpful: number | null;
}

/**
 * Số liệu sử dụng thật cho hàng số ở đầu trang chủ (PLAN.md giai đoạn 5). Lưu đệm theo giờ để trang chủ không
 * truy vấn mỗi lượt xem. Khi build không có cơ sở dữ liệu thì trả null và trang chủ dùng số liệu tĩnh.
 */
export async function getUsageStats(): Promise<UsageStats | null> {
  "use cache";
  cacheLife("hours");
  try {
    const [[a], [p], [f]] = await Promise.all([
      db.select({ n: count() }).from(messages)
        .where(and(eq(messages.role, "assistant"), isNull(messages.refused), eq(messages.incomplete, false))),
      db.select({ n: count() }).from(practiceAttempts),
      db.select({ n: count(), up: sql<number>`count(*) filter (where ${feedback.rating} = 1)`.mapWith(Number) }).from(feedback),
    ]);
    return { answers: a.n, practice: p.n, helpful: f.n >= MIN_RATINGS ? f.up / f.n : null };
  } catch {
    return null;
  }
}
