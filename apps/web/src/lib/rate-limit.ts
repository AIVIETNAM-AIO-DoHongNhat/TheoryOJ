import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export interface RateRule {
  key: string;
  windowSec: number;
  max: number;
}

/**
 * Đếm theo cửa sổ cố định trong Postgres, nên vẫn đúng khi chạy nhiều tiến trình web.
 * Trả về số giây cần chờ nếu một quy tắc bị vượt, ngược lại trả về 0.
 */
export async function hitRateLimits(rules: RateRule[]): Promise<number> {
  let wait = 0;
  for (const r of rules) {
    const rows = await db.execute<{ count: number; reset_in: number }>(sql`
      insert into chat_rate_limits (key, window_start, count) values (${r.key}, now(), 1)
      on conflict (key) do update set
        count = case when chat_rate_limits.window_start <= now() - make_interval(secs => ${r.windowSec})
                     then 1 else chat_rate_limits.count + 1 end,
        window_start = case when chat_rate_limits.window_start <= now() - make_interval(secs => ${r.windowSec})
                            then now() else chat_rate_limits.window_start end
      returning count,
        ceil(extract(epoch from window_start + make_interval(secs => ${r.windowSec}) - now()))::int as reset_in
    `);
    const row = rows[0];
    if (row && row.count > r.max) wait = Math.max(wait, row.reset_in);
  }
  return wait;
}

/** IP của người dùng. Caddy đặt X-Forwarded-For; khi phát triển không có thì dùng "local". */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
