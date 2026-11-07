/** Kết quả Server Action trả về trình duyệt: lỗi viết sẵn cho người dùng thay vì ném lỗi (Next.js che nội dung lỗi ở bản build). */
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Như ActionResult nhưng dữ liệu nằm trong `data`, cho action trả về một giá trị bất kỳ (mảng, đối tượng, void). */
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Lỗi có lời nhắn viết cho người dùng. `run` (lib/run-action.ts) chuyển nó thành `{ ok: false, error }`. */
export class UserError extends Error {}

/** Lỗi `unwrap` ném ở trình duyệt, mang lời nhắn máy chủ viết cho người dùng. */
export class ActionError extends Error {}

/**
 * Phía trình duyệt: lấy dữ liệu, hoặc ném `ActionError` mang đúng lời nhắn của máy chủ.
 * Lỗi ném ở trình duyệt nên Next.js không che nội dung.
 */
export function unwrap<T>(result: DataResult<T>): T {
  if (!result.ok) throw new ActionError(result.error);
  return result.data;
}

/**
 * Lời nhắn để hiện trong khối `catch`: lời của máy chủ nếu có, không thì câu dự phòng.
 * Lỗi mạng hay lỗi máy chủ ngoài dự kiến (Next.js thay bằng câu tiếng Anh chung chung) đều dùng câu dự phòng.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ActionError ? error.message : fallback;
}
