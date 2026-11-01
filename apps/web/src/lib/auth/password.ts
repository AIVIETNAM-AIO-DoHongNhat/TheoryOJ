import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Băm mật khẩu bằng scrypt của Node, không cần thư viện ngoài. Lưu dạng "scrypt$N$r$p$muối$băm" (base64url)
// để sau này tăng tham số mà mật khẩu cũ vẫn kiểm tra được.

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 32;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, { N: +n, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

/** Mật khẩu tạm khi quản trị đặt lại: 12 ký tự, bỏ các chữ dễ nhầm (0/O, 1/l/I). */
export function temporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(12), (b) => chars[b % chars.length]).join("");
}
