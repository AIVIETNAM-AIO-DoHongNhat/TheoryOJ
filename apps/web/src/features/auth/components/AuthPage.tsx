import { ArrowLeft, ChartNoAxesColumn, History, type LucideIcon, MonitorSmartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AcademyLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { site } from "@/features/landing/content";
import { cn } from "@/lib/utils";

// Hình minh họa vẽ bằng SVG (sách, ngôi sao, thẻ tiến độ), sắc nét ở mọi kích thước màn hình.
const PHOTO = "/anh-khoa/nen-dang-nhap.svg";

interface Perk {
  icon: LucideIcon;
  title: string;
  text: string;
}

const PERKS: Perk[] = [
  { icon: ChartNoAxesColumn, title: "Tiến độ theo chương", text: "Biết chương nào đã vững, chương nào cần ôn lại trước khi thi." },
  { icon: History, title: "Lịch sử hỏi trợ lý", text: "Các câu đã hỏi được lưu lại, mở lại lúc nào cũng được." },
  { icon: MonitorSmartphone, title: "Học trên mọi thiết bị", text: "Đổi từ máy tính sang điện thoại, tiến độ vẫn giữ nguyên." },
];

/** Thẻ kính mờ nổi trên ảnh, mỗi thẻ một lợi ích của tài khoản. */
function PerkCard({ perk, className }: { perk: Perk; className?: string }) {
  const Icon = perk.icon;
  return (
    <li className={cn("glass-dark flex min-w-0 flex-1 basis-0 items-start gap-3 rounded-3xl p-5 text-white", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-mint/15 text-mint">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 text-sm leading-snug">
        <p className="font-medium">{perk.title}</p>
        <p className="mt-1 text-white/75">{perk.text}</p>
      </div>
    </li>
  );
}

/**
 * Khung chung của đăng nhập, đăng ký, chia đôi màn hình: bên trái là logo, nút về trang chủ và nội dung trang
 * (`children`); bên phải (từ lg) là hình minh họa SVG bo góc, có các thẻ kính mờ nêu lợi ích của tài khoản.
 * Render một lần ở `(xac-thuc)/layout.tsx`, nên khi chuyển giữa hai trang, khung này giữ nguyên, ảnh không chạy lại
 * animation; chỉ phần AuthPage bên trái được thay. Trang đứng riêng, không có đầu trang và chân trang.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      {/* Cột trái: form */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 p-4 sm:px-8 sm:pt-6">
          <Link href="/" className="animate-rise flex min-w-0 items-center gap-3">
            <AcademyLogo className="size-11 shrink-0" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {site.unit}
              </span>
              <span className="truncate font-heading text-base font-bold uppercase tracking-[0.03em] text-forest dark:text-primary">
                {site.facultyShort}
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            className="animate-rise shrink-0 text-muted-foreground"
            render={<Link href="/" />}
            nativeButton={false}
          >
            <ArrowLeft data-icon="inline-start" />
            <span className="max-sm:sr-only">Về trang chủ</span>
          </Button>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pt-6 pb-12 sm:px-8">{children}</div>
      </section>

      {/*
        Cột phải: ảnh và thẻ lợi ích. Dính ở đỉnh để form đăng ký dài cuộn được mà ảnh vẫn đứng yên.
        Khung nền xanh hiện ngay từ khung hình đầu (không để nửa màn hình trắng trong lúc chờ hiệu ứng), chỉ ảnh mờ dần lên
        và thẻ lợi ích nổi lên sau một nhịp ngắn.
      */}
      <aside className="sticky top-0 hidden h-svh flex-1 self-start p-4 lg:block">
        <div className="relative isolate h-full overflow-hidden rounded-3xl bg-forest">
          <div className="animate-fade-in absolute inset-0 -z-20">
            <Image src={PHOTO} alt="" fill priority sizes="50vw" className="object-cover" />
          </div>
          <div className="absolute inset-0 -z-10 bg-linear-to-t from-forest/95 via-forest/35 to-forest/10" />
          <ul className="absolute inset-x-0 bottom-0 flex gap-3 p-6 xl:p-8">
            <PerkCard perk={PERKS[0]} className="animate-pop-in anim-delay-200" />
            <PerkCard perk={PERKS[1]} className="animate-pop-in anim-delay-280 hidden xl:flex" />
            <PerkCard perk={PERKS[2]} className="animate-pop-in anim-delay-360 hidden 2xl:flex" />
          </ul>
        </div>
      </aside>
    </div>
  );
}

/**
 * Phần riêng của từng trang trong AuthShell: tiêu đề, mô tả và form. Đổi trang thì phần này được dựng lại,
 * nên các phần tử hiện dần lần lượt (animate-rise và anim-delay-* trong globals.css).
 */
export function AuthPage({
  title,
  description,
  wide,
  children,
}: {
  title: React.ReactNode;
  description: string;
  /** Form đăng ký nhiều trường hơn nên cột form rộng hơn. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-8", wide ? "max-w-lg" : "max-w-md")}>
      <div className="flex flex-col gap-3">
        <h1 className="animate-rise text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="animate-rise anim-delay-40 text-pretty text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
