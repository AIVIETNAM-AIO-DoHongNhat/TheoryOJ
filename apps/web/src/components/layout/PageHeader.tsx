import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/** Đầu trang con: đường dẫn, tiêu đề, đoạn dẫn và vùng nút bên phải. */
export function PageHeader({
  crumbs,
  title,
  lead,
  actions,
  children,
  className,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b bg-subtle", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:py-12">
        <Breadcrumb>
          <BreadcrumbList>
            {[{ label: "Trang chủ", href: "/" }, ...crumbs].map((c, i, all) => (
              <Fragment key={c.label}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {c.href && i < all.length - 1 ? (
                    <BreadcrumbLink render={<Link href={c.href} />}>{c.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="line-clamp-1">{c.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-balance text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
            {lead && <p className="text-pretty text-base leading-relaxed text-muted-foreground">{lead}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
