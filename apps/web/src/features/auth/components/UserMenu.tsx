"use client";

import { CalendarCheck, ChartNoAxesColumn, LayoutDashboard, LogIn, LogOut, type LucideIcon, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { logout } from "../actions";

/** Chữ cái đầu của tên gọi (từ cuối trong họ tên tiếng Việt). */
function initial(fullName: string): string {
  return fullName.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? "?";
}

export function SignInButton() {
  const pathname = usePathname();
  const next = pathname.startsWith("/dang-") ? "/hoc" : pathname;
  return (
    <Button
      variant="outline"
      render={<Link href={`/dang-nhap?tiep=${encodeURIComponent(next)}`} />}
      nativeButton={false}
      aria-label="Đăng nhập"
      className={
        // Nút viền mảnh, chữ trơn để không tranh chỗ với menu; rê chuột thì ngả màu chủ đạo.
        "size-9 rounded-full bg-card px-0 text-[13px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary sm:h-9 sm:w-auto sm:px-4"
      }
    >
      {/* Màn hẹp chỉ còn biểu tượng tròn để đầu trang không tràn. */}
      <LogIn className="sm:hidden" />
      <span className="hidden sm:inline">Đăng nhập</span>
    </Button>
  );
}

interface MenuLink {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
}

const STUDENT_LINKS: MenuLink[] = [
  { href: "/hoc", icon: CalendarCheck, label: "Hôm nay", hint: "Việc nên làm, chuỗi ngày học" },
  { href: "/tien-do", icon: ChartNoAxesColumn, label: "Tiến độ ôn tập", hint: "Điểm, thẻ đã thuộc theo chương" },
];
const TEACHER_LINKS: MenuLink[] = [{ href: "/quan-tri", icon: LayoutDashboard, label: "Trang quản trị", hint: "Học viên, lớp, hỏi đáp cần xem" }];
const ACCOUNT_LINK: MenuLink = { href: "/tai-khoan", icon: UserRound, label: "Tài khoản", hint: "Họ tên, lớp, đổi mật khẩu" };

/** Menu tài khoản ở góc phải đầu trang: thẻ thông tin, lối vào trang cá nhân, đăng xuất. */
export function UserMenu({
  fullName,
  studentCode,
  classroom,
  teacher,
}: {
  fullName: string;
  studentCode: string;
  /** Tên lớp (users.class_name). */
  classroom: string;
  teacher: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const links = [...(teacher ? TEACHER_LINKS : STUDENT_LINKS), ACCOUNT_LINK];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full p-0.5 ring-2 ring-transparent transition-shadow hover:ring-primary/25 aria-expanded:ring-primary/40"
            aria-label={`Tài khoản của ${fullName}`}
          />
        }
      >
        <Avatar>
          <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initial(fullName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="mb-1 flex items-center gap-3 rounded-md bg-primary-soft p-3">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary font-heading text-base font-bold text-primary-foreground">{initial(fullName)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{fullName}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {teacher ? "Giảng viên" : "Học viên"}
                </span>
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {studentCode}
                {classroom && ` · Lớp ${classroom}`}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <DropdownMenuItem
                key={l.href}
                render={<Link href={l.href} aria-current={active ? "page" : undefined} />}
                className={cn("gap-3 px-2 py-2", active && "bg-muted")}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors",
                    "group-focus/dropdown-menu-item:border-primary/30 group-focus/dropdown-menu-item:text-primary",
                    active && "border-primary/30 text-primary",
                  )}
                >
                  <l.icon />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{l.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{l.hint}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => startTransition(() => logout())} className="gap-3 px-2 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <LogOut />
            </span>
            {pending ? "Đang đăng xuất…" : "Đăng xuất"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
