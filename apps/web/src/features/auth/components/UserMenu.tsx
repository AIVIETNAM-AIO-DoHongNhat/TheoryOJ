"use client";

import { ChartNoAxesColumn, LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logout } from "../actions";

/** Chữ cái đầu của tên gọi (từ cuối trong họ tên tiếng Việt). */
function initial(fullName: string): string {
  return fullName.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? "?";
}

export function SignInButton() {
  const pathname = usePathname();
  const next = pathname.startsWith("/dang-") ? "/tien-do" : pathname;
  return (
    <Button
      size="lg"
      render={<Link href={`/dang-nhap?tiep=${encodeURIComponent(next)}`} />}
      nativeButton={false}
      aria-label="Đăng nhập"
      className="size-9 rounded-full px-0 shadow-sm shadow-primary/30 sm:h-9 sm:w-auto sm:px-4"
    >
      <LogIn />
      {/* Màn hẹp chỉ còn biểu tượng tròn để đầu trang không tràn. */}
      <span className="hidden sm:inline">Đăng nhập</span>
    </Button>
  );
}

export function UserMenu({ fullName, studentCode }: { fullName: string; studentCode: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={`Tài khoản của ${fullName}`} />}
      >
        <Avatar>
          <AvatarFallback className="bg-primary-soft font-semibold text-primary">{initial(fullName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{fullName}</span>
            <span className="text-xs font-normal">{studentCode}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/tien-do" />}>
            <ChartNoAxesColumn />
            Tiến độ ôn tập
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/tai-khoan" />}>
            <UserRound />
            Tài khoản
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={pending} onClick={() => startTransition(() => logout())}>
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
