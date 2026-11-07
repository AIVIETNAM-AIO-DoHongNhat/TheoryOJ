/** Kết quả Server Action trả về trình duyệt: lỗi viết sẵn cho người dùng thay vì ném lỗi (Next.js che nội dung lỗi ở bản build). */
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
