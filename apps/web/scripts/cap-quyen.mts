/**
 * Cấp hoặc thu quyền giảng viên (vào được /quan-tri). Giảng viên không tự đăng ký quyền này trên web.
 *
 *   npm run cap-quyen -- GV-KTCT-01                         # nâng tài khoản đã đăng ký thành giảng viên
 *   npm run cap-quyen -- GV-KTCT-01 --tao "Nguyễn Văn A"    # tạo tài khoản giảng viên mới, in mật khẩu tạm
 *   npm run cap-quyen -- GV-KTCT-01 --thu                   # thu quyền, trở lại tài khoản học viên
 *
 * Trên máy chủ: docker compose -f infra/docker-compose.prod.yml run --rm migrate npx tsx scripts/cap-quyen.mts GV-KTCT-01
 */
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

import postgres from "postgres";

import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { tao: { type: "string" }, thu: { type: "boolean", default: false } },
});
const code = positionals[0]?.trim().toUpperCase();
if (!code || !/^[A-Z0-9._-]{3,32}$/.test(code)) {
  console.error('Cần mã tài khoản, ví dụ: npm run cap-quyen -- GV-KTCT-01 [--tao "Họ tên"] [--thu]');
  process.exit(1);
}

const sql = postgres(env.DATABASE_URL, { max: 1 });
try {
  if (values.tao) {
    const password = temporaryPassword();
    const [u] = await sql`
      insert into users (id, student_code, full_name, class_name, password_hash, visitor_id, role)
      values (${randomUUID()}, ${code}, ${values.tao.trim()}, 'Giảng viên', ${await hashPassword(password)}, ${randomUUID()}, 'giang-vien')
      on conflict (student_code) do nothing returning id`;
    if (!u) {
      console.error(`Mã ${code} đã có tài khoản. Bỏ --tao để nâng tài khoản đó thành giảng viên.`);
      process.exitCode = 1;
    } else {
      console.log(`Đã tạo tài khoản giảng viên ${code} · ${values.tao.trim()}`);
      console.log(`Mật khẩu tạm: ${password} (đổi ở trang Tài khoản sau khi đăng nhập)`);
    }
  } else {
    const role = values.thu ? "hoc-vien" : "giang-vien";
    const [u] = await sql`update users set role = ${role} where student_code = ${code} returning full_name`;
    if (!u) {
      console.error(`Không có tài khoản mã ${code}. Thêm --tao "Họ tên" để tạo mới.`);
      process.exitCode = 1;
    } else {
      console.log(`${code} · ${u.full_name}: ${values.thu ? "đã thu quyền giảng viên" : "đã cấp quyền giảng viên"}`);
    }
  }
} finally {
  await sql.end();
}
