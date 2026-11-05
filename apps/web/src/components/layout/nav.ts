export interface NavItem {
  href: string;
  label: string;
  description?: string;
  /** Mục chưa mở, hiện mờ kèm nhãn "Sắp triển khai". */
  soon?: boolean;
  children?: NavItem[];
}

/**
 * Menu chính của toàn trang. Bài học và Ôn tập cùng dẫn tới trang chọn môn của nhánh mình, không mở danh sách môn khi rê chuột.
 * Trợ lý là nút nổi ở góc phải.
 */
export const NAV: NavItem[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/mon", label: "Bài học" },
  { href: "/on-tap", label: "Ôn tập" },
  { href: "/thu-vien", label: "Thư viện" },
  { href: "/bai-viet", label: "Bài viết" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

export const ASSISTANT = { href: "/tro-ly", label: "Trợ lý học tập" };

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
