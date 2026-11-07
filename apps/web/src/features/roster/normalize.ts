/**
 * Dạng chuẩn của tên lớp: bỏ khoảng trắng thừa, viết hoa. Lưu ở dạng này trong danh sách học viên, tài khoản và lớp
 * được giao đề, để "b2k60", " B2K60 " và "B2k60" là cùng một lớp ở mọi nơi so sánh.
 */
export function normalizeClassName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleUpperCase("vi");
}

/** Mã học viên dạng chuẩn, như `studentCode` ở features/auth/schemas.ts. */
export function normalizeStudentCode(code: string): string {
  return code.trim().toUpperCase();
}

export const STUDENT_CODE = /^[A-Z0-9._-]{3,32}$/;
