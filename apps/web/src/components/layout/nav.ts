import { SUBJECTS } from "@/config/subjects";

export interface NavItem {
  href: string;
  label: string;
  description?: string;
  /** Mục chưa mở, hiện mờ kèm nhãn "Sắp triển khai". */
  soon?: boolean;
  children?: NavItem[];
}

/** Menu chính của toàn trang. Học liệu liệt kê mọi môn của Khoa; trợ lý là nút nổi ở góc phải. */
export const NAV: NavItem[] = [
  { href: "/", label: "Trang chủ" },
  {
    href: "/mon",
    label: "Học liệu",
    children: SUBJECTS.map((s) => ({
      href: `/mon/${s.id}`,
      label: s.name,
      description: s.active ? `${s.chapters.length} chương` : "Sắp triển khai",
      soon: !s.active,
    })),
  },
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
