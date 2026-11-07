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

/**
 * Bảng màu của nền xanh rừng. Khối ngoài mang lớp `dark` để bật bảng tối cho mọi thứ bên trong (nút, nhãn, chữ phụ các
 * trang truyền vào); khối trong đổi thẻ, viền sang kính mờ để nút `bg-card` nổi trên nền như ở đầu trang Thư viện.
 * Phải đặt ở khối trong: `.dark` trong globals.css không thuộc layer nên thắng lớp tiện ích trên cùng phần tử.
 * Hộp thoại, menu mở trong portal nằm ngoài khối này nên vẫn theo giao diện của cả trang.
 */
const HERO_TOKENS = cn(
  "[--foreground:#f1f7f3] [--card-foreground:#f1f7f3] [--muted-foreground:rgb(255_255_255/0.66)]",
  "[--card:rgb(255_255_255/0.07)] [--background:rgb(255_255_255/0.05)] [--muted:rgb(255_255_255/0.1)]",
  "[--border:rgb(255_255_255/0.14)] [--input:rgb(255_255_255/0.18)]",
  "[--primary:var(--mint)] [--primary-foreground:#04170b] [--primary-soft:rgb(134_239_172/0.14)]",
);

/**
 * Đầu trang con: đường dẫn, tiêu đề, đoạn dẫn và vùng nút bên phải, trên nền xanh rừng có lưới mảnh và quầng sáng
 * (cùng kiểu với đầu trang chủ và Thư viện).
 * Có `media` (hình nhỏ bên trái tiêu đề) thì `children` nằm ngay dưới tiêu đề, cạnh hình.
 */
export function PageHeader({
  crumbs,
  title,
  lead,
  actions,
  media,
  children,
  className,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  media?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const heading = (
    <div className="flex max-w-3xl flex-col gap-3.5">
      <h1 className="animate-rise text-balance text-[32px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[44px]">{title}</h1>
      {lead && <p className="animate-rise anim-delay-80 text-pretty text-base leading-relaxed text-white/70 sm:text-lg">{lead}</p>}
      {media && <div className="animate-rise anim-delay-160">{children}</div>}
    </div>
  );
  return (
    <section className={cn("dark mesh-dark relative isolate overflow-hidden [color-scheme:dark]", className)}>
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[8%] -z-10 size-96 rounded-full bg-primary-bright/20 blur-[110px] motion-safe:animate-drift"
      />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-24 -z-10 size-96 rounded-full bg-emerald-400/10 blur-[100px]" />
      {/* Các vòng tròn đồng tâm mờ ở góc phải, để đầu trang không trống khi không có nút hay hình. */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 right-[6%] -z-10 hidden -translate-y-1/2 lg:block">
        {[520, 380, 240].map((s, i) => (
          <div
            key={s}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
            style={{ width: s, height: s, background: i === 2 ? "radial-gradient(circle, rgb(134 239 172 / 0.08), transparent 70%)" : undefined }}
          />
        ))}
      </div>
      {/* Vệt sáng mảnh ở mép dưới, tách đầu trang với phần nội dung. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-mint/40 to-transparent" />

      <div className={cn("mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-9 pb-12 text-foreground sm:pt-11 sm:pb-14", HERO_TOKENS)}>
        <Breadcrumb>
          <BreadcrumbList className="text-white/55">
            {[{ label: "Trang chủ", href: "/" }, ...crumbs].map((c, i, all) => (
              <Fragment key={c.label}>
                {i > 0 && <BreadcrumbSeparator className="text-white/35" />}
                <BreadcrumbItem>
                  {c.href && i < all.length - 1 ? (
                    <BreadcrumbLink render={<Link href={c.href} />} className="text-white/55 hover:text-white">
                      {c.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="line-clamp-1 text-white/90">{c.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {media ? (
            <div className="flex items-start gap-5 sm:gap-7">
              {media}
              {heading}
            </div>
          ) : (
            heading
          )}
          {actions && <div className="animate-rise anim-delay-160 flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {!media && children && <div className="animate-rise anim-delay-160">{children}</div>}
      </div>
    </section>
  );
}
