import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Cửa sổ dài nhất đang dùng là một ngày; dòng cũ hơn hai ngày không còn tác dụng. */
const STALE = "2 days";

/** Khoảng 1% lần gọi thì xóa các dòng đếm đã hết hạn, để bảng không phình mãi theo mỗi IP, mỗi mã khách từng ghé. */
async function pruneSometimes() {
  if (Math.random() >= 0.01) return;
  await db.execute(sql`delete from chat_rate_limits where window_start < now() - ${STALE}::interval`);
}

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
  await pruneSometimes();
  return wait;
}

/**
 * IP của người dùng. Caddy là proxy duy nhất và ghi IP thật vào cuối X-Forwarded-For, nên lấy phần tử cuối:
 * phần tử đầu do trình duyệt tự gửi được, dùng nó thì ai cũng đổi IP để lách giới hạn. Khi phát triển dùng "local".
 * Chạy sau một lớp proxy khác (Cloudflare Tunnel) thì phần tử cuối là IP của proxy đó, cả trường chung một IP;
 * khi đó đặt TRUSTED_IP_HEADER (ví dụ cf-connecting-ip) để đọc IP thật từ header proxy ấy ghi.
 */
export function clientIp(headers: Headers): string {
  const trusted = env.TRUSTED_IP_HEADER ? headers.get(env.TRUSTED_IP_HEADER)?.trim() : undefined;
  return trusted || headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || headers.get("x-real-ip") || "local";
}
