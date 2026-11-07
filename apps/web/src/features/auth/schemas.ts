import { z } from "zod";

import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/password";

import { safeNext } from "./next";

export { safeNext };

// Dùng chung cho form (client) và Server Action. Mã học viên viết hoa để đăng nhập không phân biệt hoa thường.

export const studentCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9._-]{3,32}$/, "Mã học viên gồm 3–32 ký tự: chữ, số, dấu chấm, gạch nối.");

const password = z
  .string()
  .min(PASSWORD_MIN, `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.`)
  .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`);

export const RegisterInput = z
  .object({
    studentCode,
    fullName: z.string().trim().min(2, "Nhập họ và tên.").max(80, "Họ tên tối đa 80 ký tự."),
    className: z.string().trim().min(1, "Nhập lớp.").max(40, "Tên lớp tối đa 40 ký tự."),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại không khớp." });

export const LoginInput = z.object({
  studentCode,
  password: z.string().min(1, "Nhập mật khẩu.").max(PASSWORD_MAX),
});

export const ChangePasswordInput = z
  .object({ current: z.string().min(1, "Nhập mật khẩu hiện tại."), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại không khớp." });

export const ProfileInput = z.object({
  fullName: z.string().trim().min(2, "Nhập họ và tên.").max(80, "Họ tên tối đa 80 ký tự."),
  className: z.string().trim().min(1, "Nhập lớp.").max(40, "Tên lớp tối đa 40 ký tự."),
});

/** Kết quả trả về form: lỗi theo trường, lỗi chung, hoặc thông báo thành công. */
export interface FormState {
  errors?: Record<string, string>;
  message?: string;
  ok?: boolean;
  /** Giá trị đã nhập (trừ mật khẩu) để điền lại khi báo lỗi. */
  values?: Record<string, string>;
  /** Đăng nhập, đăng ký thành công: trang chuyển tới và họ tên để màn chào mừng gọi tên. */
  to?: string;
  fullName?: string;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Trang sau khi đăng nhập. Giảng viên luôn vào trang quản trị (giao diện học tập dành cho khách và học viên),
 * trừ khi đang mở một trang con của /quan-tri.
 */
export function homeFor(role: "hoc-vien" | "giang-vien", next: unknown): string {
  const target = safeNext(next);
  if (role !== "giang-vien") return target;
  return target === "/quan-tri" || target.startsWith("/quan-tri/") || target.startsWith("/quan-tri?") ? target : "/quan-tri";
}
