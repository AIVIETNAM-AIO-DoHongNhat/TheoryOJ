"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { ADMIN_NAV, isActive } from "./AdminSidebar";

/** Đường dẫn dạng "Quản trị / Học viên / B2K60-001" dựng từ địa chỉ trang. */
function crumbs(pathname: string) {
  const items: { href: string; label: string }[] = [{ href: "/quan-tri", label: "Quản trị" }];
  const section = ADMIN_NAV.find((n) => n.href !== "/quan-tri" && isActive(pathname, n.href));
  if (section) items.push({ href: section.href, label: section.label });
  else items.push({ href: "/quan-tri", label: "Tổng quan" });
  const rest = section ? pathname.slice(section.href.length).split("/").filter(Boolean) : [];
  if (rest[0] && section) {
    // Trang con: mã học viên viết hoa; đề thi theo số đề, trang tạo, trang sửa.
    const seg = decodeURIComponent(rest[0]);
    const label = section.href === "/quan-tri/de-thi" ? (seg === "moi" ? "Tạo đề" : `Đề #${seg}`) : seg.toUpperCase();
    items.push({ href: `${section.href}/${rest[0]}`, label });
    if (rest[1] === "sua") items.push({ href: pathname, label: "Sửa" });
  }
  return items;
}

export function AdminTopbar({ toReview }: { toReview: number }) {
  const pathname = usePathname();
  const items = crumbs(pathname);

  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-5 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1 mr-1 text-muted-foreground" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap text-[13px]">
          {items.map((c, i) => (
            <Fragment key={`${c.href}-${i}`}>
              {i > 0 && <BreadcrumbSeparator className={cn(i === 1 && "hidden sm:list-item")} />}
              <BreadcrumbItem className={cn("min-w-0", i === 0 && "hidden sm:inline-flex")}>
                {i === items.length - 1 ? (
                  <BreadcrumbPage className="truncate font-medium">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={c.href} />}>{c.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/quan-tri/hoi-dap"
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
            toReview > 0
              ? "border-warn/30 bg-warn-soft text-warn hover:border-warn/50"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label={toReview > 0 ? `${toReview} câu trả lời cần xem` : "Không có câu trả lời cần xem"}
        >
          <span className="relative inline-flex">
            <Bell className="size-3.5" strokeWidth={2} />
            {toReview > 0 && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warn ring-2 ring-warn-soft" />}
          </span>
          <span className="hidden tabular-nums sm:inline">{toReview > 0 ? `${toReview} cần xem` : "Đã xem hết"}</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
