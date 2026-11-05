"use client";

import { ArrowLeft, ChartColumnBig, LayoutDashboard, LogOut, MessagesSquare, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { AcademyLogo } from "@/components/brand";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { logout } from "@/features/auth/actions";

const ITEMS = [
  { href: "/quan-tri", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/quan-tri/hoc-vien", label: "Học viên", icon: Users },
  { href: "/quan-tri/lop", label: "Theo lớp", icon: ChartColumnBig },
  { href: "/quan-tri/hoi-dap", label: "Hỏi đáp", icon: MessagesSquare },
];

const isActive = (pathname: string, href: string) =>
  href === "/quan-tri" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function AdminSidebar({ fullName, toReview }: { fullName: string; toReview: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [pending, startTransition] = useTransition();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/quan-tri" />}>
              <AcademyLogo className="size-8 drop-shadow-none" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-heading text-base font-bold uppercase text-primary">Quản trị</span>
                <span className="truncate text-xs text-muted-foreground">{"Khoa LLCT&KHXHNV"}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Giảng viên</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, href)}
                    tooltip={label}
                    render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {href === "/quan-tri/hoi-dap" && toReview > 0 && (
                    <SidebarMenuBadge className="bg-destructive/10 text-destructive">{toReview}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Về trang học tập" render={<Link href="/" />}>
              <ArrowLeft />
              <span>Về trang học tập</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Đăng xuất" disabled={pending} onClick={() => startTransition(() => logout())}>
              <LogOut />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate">Đăng xuất</span>
                <span className="truncate text-xs text-muted-foreground">{fullName}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
