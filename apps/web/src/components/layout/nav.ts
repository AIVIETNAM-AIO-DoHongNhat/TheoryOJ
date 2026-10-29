import { DEFAULT_SUBJECT, getSubject } from "@/config/subjects";

export interface NavItem {
  href: string;
  label: string;
  description?: string;
  children?: NavItem[];
}

const subject = getSubject(DEFAULT_SUBJECT)!;

/** Menu chính của toàn trang. Trợ lý là một tính năng, có nút riêng ở góc phải. */
export const NAV: NavItem[] = [
  { href: "/", label: "Trang chủ" },
  {
    href: `/mon/${subject.id}`,
    label: "Học liệu",
    children: subject.chapters.map((c) => ({
      href: `/mon/${subject.id}/chuong/${c.number}`,
      label: `Chương ${c.number}`,
      description: c.title,
    })),
  },
  { href: "/thu-vien", label: "Thư viện" },
  { href: "/bai-viet", label: "Bài viết" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

export const ASSISTANT = { href: "/tro-ly", label: "Trợ lý học tập" };

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const base = href.split("/").slice(0, 2).join("/"); // "/mon/ktct" → "/mon"
  return pathname === href || pathname.startsWith(`${href}/`) || (base !== href && pathname.startsWith(`${base}/`));
}
