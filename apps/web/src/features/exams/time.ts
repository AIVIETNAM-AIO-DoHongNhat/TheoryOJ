// Ngày giờ của đề thi nhập và hiển thị theo giờ Việt Nam (UTC+7, không đổi giờ theo mùa), để trang dựng trên máy chủ
// (thường chạy giờ UTC) và trên trình duyệt ra cùng một giá trị.

const OFFSET_MS = 7 * 3_600_000;

/** ISO → giá trị cho ô `datetime-local` ("2026-11-06T14:00"). */
export function toLocalInput(iso: string | null): string {
  return iso ? new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 16) : "";
}

/** Giá trị ô `datetime-local` (giờ Việt Nam) → ISO, hoặc null nếu ô trống hay sai. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "14:00, 06/11/2026". */
export function formatVnTime(iso: string | Date | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  });
}
