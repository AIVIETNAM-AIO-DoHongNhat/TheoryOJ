"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { endOtherSessions, endSession, getCurrentUser, startSession } from "@/lib/auth/session";
import { clientIp, hitRateLimits } from "@/lib/rate-limit";
import { anonymousVisitorId, VISITOR_COOKIE } from "@/lib/visitor";

import {
  ChangePasswordInput, fieldErrors, type FormState, homeFor, LoginInput, ProfileInput, RegisterInput,
} from "./schemas";
import { createUser, findUserByCode, mergeVisitor, touchLogin, updatePassword, updateProfile } from "./server/users";

// Cả lớp thường dùng chung một IP (mạng nội bộ), nên giới hạn theo IP rộng, giới hạn theo mã học viên chặt.
const tooMany = (wait: number) => `Đồng chí thử quá nhiều lần. Vui lòng thử lại sau khoảng ${Math.max(1, Math.ceil(wait / 60))} phút.`;

/** Băm sẵn một mật khẩu giả để khi mã học viên không tồn tại vẫn tốn thời gian như khi sai mật khẩu. */
const dummyHash = hashPassword("khong-ton-tai");

/** Sau khi đăng nhập hoặc đăng ký: gộp dữ liệu của trình duyệt vào tài khoản, bỏ mã khách ẩn danh. */
async function signIn(user: { id: string; visitorId: string }) {
  const anon = await anonymousVisitorId();
  if (anon) await mergeVisitor(anon, user.visitorId);
  (await cookies()).delete(VISITOR_COOKIE);
  await startSession(user.id);
  await touchLogin(user.id);
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form);
  const values = { studentCode: String(raw.studentCode ?? ""), fullName: String(raw.fullName ?? ""), className: String(raw.className ?? "") };
  const parsed = RegisterInput.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const wait = await hitRateLimits([{ key: `dk-ip:${clientIp(await headers())}`, windowSec: 3600, max: 300 }]);
  if (wait > 0) return { message: tooMany(wait), values };

  const { studentCode, fullName, className, password } = parsed.data;
  const user = await createUser({ studentCode, fullName, className, passwordHash: await hashPassword(password) });
  if (!user) {
    return { errors: { studentCode: "Mã học viên này đã được đăng ký. Nếu là của đồng chí, hãy đăng nhập." }, values };
  }
  await signIn(user);
  redirect(homeFor(user.role, raw.next));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form);
  const values = { studentCode: String(raw.studentCode ?? "") };
  const parsed = LoginInput.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { studentCode, password } = parsed.data;

  const wait = await hitRateLimits([
    { key: `dn-ip:${clientIp(await headers())}`, windowSec: 600, max: 300 },
    { key: `dn-ma:${studentCode}`, windowSec: 600, max: 10 },
  ]);
  if (wait > 0) return { message: tooMany(wait), values };

  const user = await findUserByCode(studentCode);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !ok) return { message: "Mã học viên hoặc mật khẩu không đúng.", values };

  await signIn(user);
  redirect(homeFor(user.role, raw.next));
}

export async function logout(): Promise<void> {
  await endSession();
  // Mã khách của tài khoản không nằm trong cookie, nên sau khi đăng xuất trình duyệt trở về trạng thái khách mới.
  (await cookies()).delete(VISITOR_COOKIE);
  redirect("/");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/dang-nhap?tiep=/tai-khoan");
  const parsed = ChangePasswordInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const wait = await hitRateLimits([{ key: `dmk:${me.id}`, windowSec: 600, max: 10 }]);
  if (wait > 0) return { message: tooMany(wait) };

  const user = await findUserByCode(me.studentCode);
  if (!user || !(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { errors: { current: "Mật khẩu hiện tại không đúng." } };
  }
  await updatePassword(me.id, await hashPassword(parsed.data.password));
  await endOtherSessions(me);
  return { ok: true, message: "Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất." };
}

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/dang-nhap?tiep=/tai-khoan");
  const raw = Object.fromEntries(form);
  const values = { fullName: String(raw.fullName ?? ""), className: String(raw.className ?? "") };
  const parsed = ProfileInput.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  await updateProfile(me.id, parsed.data);
  return { ok: true, message: "Đã lưu thông tin.", values: parsed.data };
}
