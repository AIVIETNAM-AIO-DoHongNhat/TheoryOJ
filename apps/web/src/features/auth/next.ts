// Đích chuyển tiếp sau khi đăng nhập (?tiep=). File thuần, không phụ thuộc máy chủ, để form ở trình duyệt dùng được
// (schemas.ts kéo theo node:crypto qua lib/auth/password.ts).

/** Chỉ cho chuyển tiếp tới đường dẫn trong trang, chặn "//evil.com" hay "https://…". */
export function safeNext(value: unknown): string {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/hoc";
}
