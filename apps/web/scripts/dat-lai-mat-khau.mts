/**
 * Đặt lại mật khẩu cho học viên quên mật khẩu (chưa có trang quản trị). In ra mật khẩu tạm để báo cho học viên;
 * học viên đăng nhập rồi đổi ở trang Tài khoản. Mọi phiên đang mở của tài khoản bị đăng xuất.
 *
 *   npm run dat-lai-mat-khau -- B2K60-001
 *
 * Trên máy chủ: docker compose -f infra/docker-compose.prod.yml run --rm migrate npx tsx scripts/dat-lai-mat-khau.mts B2K60-001
 */
import postgres from "postgres";

import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";

const code = process.argv.slice(2).find((a) => !a.startsWith("-"))?.trim().toUpperCase();
if (!code) {
  console.error("Cần mã học viên, ví dụ: npm run dat-lai-mat-khau -- B2K60-001");
  process.exit(1);
}

const sql = postgres(env.DATABASE_URL, { max: 1 });
try {
  const password = temporaryPassword();
  const [user] = await sql<{ id: string; full_name: string; class_name: string }[]>`
    update users set password_hash = ${await hashPassword(password)}
    where student_code = ${code} returning id, full_name, class_name`;
  if (!user) {
    console.error(`Không có tài khoản mã ${code}.`);
    process.exitCode = 1;
  } else {
    await sql`delete from sessions where user_id = ${user.id}`;
    console.log(`${code} · ${user.full_name} · lớp ${user.class_name}`);
    console.log(`Mật khẩu tạm: ${password}`);
  }
} finally {
  await sql.end();
}
