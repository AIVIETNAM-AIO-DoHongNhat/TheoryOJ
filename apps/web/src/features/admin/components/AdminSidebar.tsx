"use client";

import { ArrowUpRight, ChartColumnBig, ClipboardList, IdCard, LayoutDashboard, Library, LogOut, MessagesSquare, PenLine, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AcademyLogo } from "@/components/brand";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/features/auth/components/UserMenu";
import { cn } from "@/lib/utils";

import { Initials } from "./AdminUi";

export const ADMIN_NAV = [
  { href: "/quan-tri", label: "Tổng quan", icon: LayoutDashboard, group: "Theo dõi" },
  { href: "/quan-tri/hoc-vien", label: "Học viên", icon: Users, group: "Theo dõi" },
  { href: "/quan-tri/lop", label: "Theo lớp", icon: ChartColumnBig, group: "Theo dõi" },
  { href: "/quan-tri/danh-sach", label: "Danh sách lớp", icon: IdCard, group: "Theo dõi" },
  { href: "/quan-tri/hoi-dap", label: "Hỏi đáp", icon: MessagesSquare, group: "Theo dõi" },
  { href: "/quan-tri/cham-bai", label: "Chấm bài", icon: PenLine, group: "Theo dõi" },
  { href: "/quan-tri/cau-hoi", label: "Ngân hàng câu hỏi", icon: Library, group: "Nội dung" },
  { href: "/quan-tri/de-thi", label: "Đề thi", icon: ClipboardList, group: "Nội dung" },
];

const NAV_GROUPS = [...new Set(ADMIN_NAV.map((n) => n.group))];

export const isActive = (pathname: string, href: string) =>
  href === "/quan-tri" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/** Nút trong thanh bên tối: chữ mờ, mục đang chọn có nền sáng nhẹ, vạch xanh bên trái và biểu tượng xanh. */
const ITEM = cn(
  "relative h-9 gap-3 rounded-lg px-3 text-[13.5px] text-sidebar-foreground/80 transition-colors",
  "hover:bg-sidebar-accent hover:text-white",
  "data-active:bg-sidebar-accent data-active:font-medium data-active:text-white data-active:[&>svg]:text-sidebar-primary",
  "data-active:before:absolute data-active:before:inset-y-2 data-active:before:-left-2 data-active:before:w-[3px] data-active:before:rounded-r-full data-active:before:bg-sidebar-primary",
  "group-data-[collapsible=icon]:before:hidden",
  "[&>span]:transition-opacity [&>span]:duration-200 group-data-[collapsible=icon]:[&>span]:opacity-0",
);

/** Chữ mờ dần khi thanh bên thu về dạng biểu tượng, hiện lại khi mở (chậm hơn một nhịp để không chồng lên lúc đang giãn). */
const FADE = "transition-opacity duration-300 delay-75 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0";

export function AdminSidebar({ fullName, toReview, toGrade }: { fullName: string; toReview: number; toGrade: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="inset">
      {/* Bản di động mở trong Sheet nằm ngoài cây của SidebarProvider, nên đặt lại bảng màu tối ở đây. */}
      <div className="admin-chrome admin-glow relative isolate flex h-full w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground md:rounded-xl md:ring-1 md:ring-white/5">
        <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-70 bg-size-[32px_32px]" aria-hidden />
        <SidebarHeader className="pt-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-transparent active:bg-transparent" render={<Link href="/quan-tri" />}>
                {/* Logo đứng thẳng trên nền tối, không ô nền trắng; giữ khung 8 để thẳng hàng với biểu tượng menu khi thu gọn. */}
                <AcademyLogo className="size-8" />
                <span className={cn("flex min-w-0 flex-col leading-tight", FADE)}>
                  <span className="truncate font-heading text-[15px] font-bold tracking-wide text-white">TheoryOJ</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/60">{"Quản trị · Khoa LLCT&KHXHNV"}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="pt-2">
          {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              {group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {ADMIN_NAV.filter((n) => n.group === group).map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={isActive(pathname, href)}
                      tooltip={label}
                      className={ITEM}
                      render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                    >
                      <Icon strokeWidth={1.9} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {href === "/quan-tri/hoi-dap" && toReview > 0 && (
                      <SidebarMenuBadge className="top-2! right-2 rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-amber-950! peer-hover/menu-button:text-amber-950! peer-data-active/menu-button:text-amber-950!">
                        {toReview > 99 ? "99+" : toReview}
                      </SidebarMenuBadge>
                    )}
                    {href === "/quan-tri/cham-bai" && toGrade > 0 && (
                      <SidebarMenuBadge className="top-2! right-2 rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-amber-950! peer-hover/menu-button:text-amber-950! peer-data-active/menu-button:text-amber-950!">
                        {toGrade > 99 ? "99+" : toGrade}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-1 pb-3">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Về trang học tập" className={ITEM} render={<Link href="/" />}>
                <ArrowUpRight strokeWidth={1.9} />
                <span>Về trang học tập</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="mx-1 my-1 h-px bg-sidebar-border group-data-[collapsible=icon]:mx-0" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={`Đăng xuất (${fullName})`}
                onClick={() => signOut(fullName)}
                className="group/user h-12 gap-3 rounded-lg px-2 hover:bg-sidebar-accent"
              >
                <Initials name={fullName} className="size-8 bg-none bg-white/10 text-[11px] text-white ring-white/15" />
                <span className={cn("flex min-w-0 flex-1 flex-col leading-tight", FADE)}>
                  <span className="truncate text-[13px] font-medium text-white">{fullName}</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/55">Giảng viên</span>
                </span>
                <LogOut className={cn("ml-auto text-sidebar-foreground/50 group-hover/user:text-white", FADE)} strokeWidth={1.9} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
