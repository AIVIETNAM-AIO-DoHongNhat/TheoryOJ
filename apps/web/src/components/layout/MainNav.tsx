"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

import { isActive, NAV } from "./nav";

// Gạch xanh dưới mục đang mở, giống thanh menu của trang đơn vị.
const item =
  "relative h-16 rounded-none bg-transparent px-3 text-[15px] font-medium text-foreground/80 hover:bg-transparent hover:text-primary focus:bg-transparent data-active:bg-transparent data-popup-open:bg-transparent data-open:bg-transparent after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-primary after:opacity-0 after:transition-opacity data-active:text-primary data-active:after:opacity-100";

export function MainNav() {
  const pathname = usePathname();
  // Trạng thái mở gắn với đường dẫn lúc mở: sang trang khác thì menu thả xuống tự đóng,
  // không còn treo lại khi rê chuột qua "Học liệu" rồi bấm mục khác.
  const [open, setOpen] = useState<{ value: string | null; path: string }>({ value: null, path: pathname });
  const value = open.path === pathname ? open.value : null;
  const close = () => setOpen({ value: null, path: pathname });

  return (
    <NavigationMenu
      className="hidden lg:flex"
      align="center"
      value={value}
      onValueChange={(v) => setOpen({ value: (v as string | null) ?? null, path: pathname })}
    >
      <NavigationMenuList>
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <NavigationMenuItem key={n.href} value={n.href}>
              {n.children ? (
                <>
                  <NavigationMenuTrigger className={item} data-active={active || undefined}>
                    {n.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[560px] grid-cols-2 gap-1 p-2">
                      {n.children.map((c) => (
                        <li key={c.href}>
                          <NavigationMenuLink
                            render={<Link href={c.href} onClick={close} />}
                            active={pathname.startsWith(c.href)}
                            className={cn("flex-col items-start gap-0.5 p-3", c.soon && "opacity-60")}
                          >
                            <span className="text-sm font-semibold leading-snug">{c.label}</span>
                            <span className={cn("text-xs", c.soon ? "text-muted-foreground" : "text-primary")}>{c.description}</span>
                          </NavigationMenuLink>
                        </li>
                      ))}
                      <li className="col-span-2 border-t pt-1">
                        <NavigationMenuLink render={<Link href={n.href} onClick={close} />} className="p-3 text-sm font-medium text-primary">
                          Tất cả môn học →
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink render={<Link href={n.href} onClick={close} />} active={active} className={cn(item, "inline-flex items-center")}>
                  {n.label}
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
