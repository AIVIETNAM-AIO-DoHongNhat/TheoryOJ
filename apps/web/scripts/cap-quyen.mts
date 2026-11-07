/**
 * Cấp hoặc thu quyền giảng viên (vào được /quan-tri) và gán môn phụ trách. Giảng viên không tự đăng ký quyền này trên web.
 * Giảng viên chỉ chấm bài tự luận, phản bác của môn mình phụ trách (users.subjects).
 *
 *   npm run cap-quyen -- GV-KTCT-01                         # nâng tài khoản đã đăng ký thành giảng viên
 *   npm run cap-quyen -- GV-KTCT-01 --tao "Nguyễn Văn A"    # tạo tài khoản giảng viên mới, in mật khẩu tạm
 *   npm run cap-quyen -- GV-KTCT-01 --mon ktct,triet        # gán môn phụ trách (thay danh sách cũ)
 *   npm run cap-quyen -- GV-KTCT-01 --thu                   # thu quyền, trở lại tài khoản học viên
 *
 * Không ghi --mon khi cấp quyền thì giảng viên phụ trách mọi môn đang mở.
 * Trên máy chủ: docker compose -f infra/docker-compose.prod.yml run --rm migrate npx tsx scripts/cap-quyen.mts GV-KTCT-01
 */
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

import postgres from "postgres";

import { ACTIVE_SUBJECTS, SUBJECTS } from "@/config/subjects";
import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { tao: { type: "string" }, thu: { type: "boolean", default: false }, mon: { type: "string" } },
});
const code = positionals[0]?.trim().toUpperCase();
if (!code || !/^[A-Z0-9._-]{3,32}$/.test(code)) {
  console.error('Cần mã tài khoản, ví dụ: npm run cap-quyen -- GV-KTCT-01 [--tao "Họ tên"] [--mon ktct,triet] [--thu]');
  process.exit(1);
}

/** Môn ghi ở --mon, kiểm tra có trong config/subjects.ts. Không ghi thì null. */
function parseSubjects(raw: string | undefined): string[] | null {
  if (raw === undefined) return null;
  const ids = [...new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
  const known = new Set(SUBJECTS.map((s) => s.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length) {
    console.error(`Không có môn: ${unknown.join(", ")}. Mã môn hợp lệ: ${SUBJECTS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }
  return ids;
}

const chosen = parseSubjects(values.mon);
const allActive = ACTIVE_SUBJECTS.map((s) => s.id);
const label = (ids: string[]) => (ids.length ? ids.join(", ") : "chưa có môn nào");

const sql = postgres(env.DATABASE_URL, { max: 1 });
try {
  if (values.tao) {
    const password = temporaryPassword();
    const subjects = chosen ?? allActive;
    const [u] = await sql`
      insert into users (id, student_code, full_name, class_name, password_hash, visitor_id, role, subjects)
      values (${randomUUID()}, ${code}, ${values.tao.trim()}, 'Giảng viên', ${await hashPassword(password)}, ${randomUUID()}, 'giang-vien', ${subjects})
      on conflict (student_code) do nothing returning id`;
    if (!u) {
      console.error(`Mã ${code} đã có tài khoản. Bỏ --tao để nâng tài khoản đó thành giảng viên.`);
      process.exitCode = 1;
    } else {
      console.log(`Đã tạo tài khoản giảng viên ${code} · ${values.tao.trim()} · phụ trách: ${label(subjects)}`);
      console.log(`Mật khẩu tạm: ${password} (đổi ở trang Tài khoản sau khi đăng nhập)`);
    }
  } else if (values.thu) {
    const [u] = await sql`update users set role = 'hoc-vien', subjects = '{}' where student_code = ${code} returning full_name`;
    if (!u) {
      console.error(`Không có tài khoản mã ${code}.`);
      process.exitCode = 1;
    } else {
      console.log(`${code} · ${u.full_name}: đã thu quyền giảng viên`);
    }
  } else {
    // Cấp quyền: không ghi --mon thì giữ môn đã gán, chưa có môn nào thì nhận mọi môn đang mở.
    const [u] = await sql`
      update users set role = 'giang-vien',
        subjects = case when ${chosen !== null} then ${chosen ?? []}::text[]
                        when cardinality(subjects) = 0 then ${allActive}::text[]
                        else subjects end
      where student_code = ${code} returning full_name, subjects`;
    if (!u) {
      console.error(`Không có tài khoản mã ${code}. Thêm --tao "Họ tên" để tạo mới.`);
      process.exitCode = 1;
    } else {
      console.log(`${code} · ${u.full_name}: giảng viên, phụ trách: ${label(u.subjects as string[])}`);
    }
  }
} finally {
  await sql.end();
}
