"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <NavigationMenu className="hidden lg:flex" align="center">
      <NavigationMenuList>
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <NavigationMenuItem key={n.href}>
              {n.children ? (
                <>
                  <NavigationMenuTrigger className={item} data-active={active || undefined}>
                    {n.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[640px] grid-cols-2 gap-1 p-2">
                      {n.children.map((c) => (
                        <li key={c.href}>
                          <NavigationMenuLink
                            render={<Link href={c.href} />}
                            active={pathname === c.href}
                            className="flex-col items-start gap-0.5 p-3"
                          >
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{c.label}</span>
                            <span className="line-clamp-2 text-sm leading-snug">{c.description}</span>
                          </NavigationMenuLink>
                        </li>
                      ))}
                      <li className="col-span-2 border-t pt-1">
                        <NavigationMenuLink render={<Link href={n.href} />} className="p-3 text-sm font-medium text-primary">
                          Xem tất cả chương →
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink render={<Link href={n.href} />} active={active} className={cn(item, "inline-flex items-center")}>
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
