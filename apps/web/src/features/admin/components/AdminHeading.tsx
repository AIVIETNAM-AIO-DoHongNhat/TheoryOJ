/** Tiêu đề trang trong khu quản trị: tên trang, một dòng mô tả, nút bên phải. */
export function AdminHeading({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);
export const score10 = (x: number | null) => (x === null ? "—" : (Math.round(x * 100) / 10).toLocaleString("vi-VN"));
export const dateTime = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : "—";
