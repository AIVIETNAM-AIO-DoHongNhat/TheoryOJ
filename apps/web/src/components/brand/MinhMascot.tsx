import { cn } from "@/lib/utils";

/**
 * Minh, linh vật của trợ lý học tập: robot đầu tròn màu xanh, mặt màn hình sáng, mầm non hai lá trên đỉnh
 * ("mầm tri thức" lớn dần qua từng chương). Màu cố định, không theo giao diện sáng/tối, vì mặt luôn sáng trên thân xanh.
 *
 * `compact`: cắt khung sát hình và bỏ bóng đổ, để linh vật to rõ ở cỡ nhỏ (nút chat 48px, ảnh đại diện 32px).
 * Có `title` thì là hình có nghĩa (role="img"); không có thì chỉ để trang trí.
 * `size`: cạnh hình theo px, dùng khi không có CSS (ảnh xem trước khi chia sẻ liên kết, `app/opengraph-image.tsx`).
 */
export function MinhMascot({
  className,
  compact = false,
  title,
  size,
}: {
  className?: string;
  compact?: boolean;
  title?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={compact ? "12 5 96 96" : "0 0 120 120"}
      fill="none"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {!compact && <ellipse cx="60" cy="110" rx="30" ry="4" fill="#0a1a10" fillOpacity={0.08} />}
      {/* Mầm non: thân và hai lá. */}
      <path d="M60 31V17" stroke="#15803d" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M60 21C52 12 42 13 39 18C44 25 54 25 60 21Z" fill="#22c55e" />
      <path d="M60 18C66 8 78 8 82 12C78 20 67 22 60 18Z" fill="#4ade80" />
      {/* Tai hai bên và đầu. */}
      <rect x="15" y="54" width="9" height="17" rx="4.5" fill="#0b3b20" />
      <rect x="96" y="54" width="9" height="17" rx="4.5" fill="#0b3b20" />
      <rect x="21" y="30" width="78" height="66" rx="27" fill="#15803d" />
      {/* Mặt màn hình. */}
      <rect x="29" y="40" width="62" height="46" rx="19" fill="#f0fdf4" />
      <ellipse cx="47" cy="61" rx="5.2" ry="6.6" fill="#0a1a10" />
      <ellipse cx="73" cy="61" rx="5.2" ry="6.6" fill="#0a1a10" />
      <circle cx="49" cy="58.4" r="1.9" fill="#fff" />
      <circle cx="75" cy="58.4" r="1.9" fill="#fff" />
      <ellipse cx="39" cy="71" rx="5" ry="3" fill="#fb7185" fillOpacity={0.45} />
      <ellipse cx="81" cy="71" rx="5" ry="3" fill="#fb7185" fillOpacity={0.45} />
      <path d="M54 71Q60 77 66 71" stroke="#0a1a10" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  );
}
