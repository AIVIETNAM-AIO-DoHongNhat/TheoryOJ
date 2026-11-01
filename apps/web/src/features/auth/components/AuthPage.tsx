import { ChartNoAxesColumn, History, MonitorSmartphone } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

import { AcademyLogo } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { site } from "@/features/landing/content";
import { cn } from "@/lib/utils";

// Ảnh hội trường Học viện, nguồn ở public/anh-khoa/NGUON.md. Ảnh nhiều chi tiết nên chỉ dùng làm phông mờ.
const PHOTO = "/anh-khoa/be-giang-toan-canh.jpg";

const PERKS = [
  { icon: ChartNoAxesColumn, text: "Tiến độ theo chương" },
  { icon: History, text: "Lịch sử hỏi trợ lý" },
  { icon: MonitorSmartphone, text: "Học trên mọi thiết bị" },
];

/**
 * Khung trang đăng nhập, đăng ký: ảnh hội trường Học viện làm mờ phủ kín, lớp xanh đậm,
 * ở giữa là logo, tên đơn vị và thẻ form trắng.
 */
export function AuthPage({
  title,
  description,
  wide,
  children,
}: {
  title: string;
  description: string;
  /** Form đăng ký nhiều trường hơn nên thẻ rộng hơn. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-forest">
      <Image src={PHOTO} alt="" fill priority sizes="100vw" className="-z-30 scale-105 object-cover blur-xs" />
      <div className="absolute inset-0 -z-20 bg-linear-to-b from-forest/70 via-forest/80 to-forest/95" />
      {/* Quầng sáng xanh phía trên để thẻ form nổi khỏi nền. Phủ cả khung để không có mép ngang. */}
      <div className="absolute inset-0 -z-10 bg-radial-[ellipse_80%_60%_at_50%_0%] from-primary/35 to-transparent" />

      <div className="flex min-h-[calc(100svh-4.25rem)] flex-col items-center px-4 py-10 sm:py-14">
        <div className="mb-8 flex flex-col items-center gap-3 text-center text-white">
          <AcademyLogo className="size-20 drop-shadow-[0_6px_20px_rgb(0_0_0/0.35)]" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">{site.unit}</span>
            <span className="font-heading text-2xl font-bold uppercase tracking-[0.03em]">{site.facultyShort}</span>
          </div>
        </div>

        <div
          className={cn(
            "w-full rounded-2xl bg-white p-6 shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:p-8",
            wide ? "max-w-lg" : "max-w-md",
          )}
        >
          <div className="mb-6 flex flex-col gap-1.5 text-center">
            <h1 className="font-heading text-3xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground text-balance">{description}</p>
          </div>
          <Suspense fallback={<Skeleton className="h-80 rounded-lg" />}>{children}</Suspense>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-white/75">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="size-4 text-mint" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
