import { BookOpenText, Clapperboard } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Video } from "@/features/video/types";
import { cn } from "@/lib/utils";

import { DOC_KINDS, type LibraryDoc } from "../types";
import { DocCover } from "./DocCover";

/** Vị trí, độ nghiêng của các bìa xếp quạt bên phải hero, từ sau ra trước. */
const FAN = [
  "left-[0%] top-[16%] -rotate-[9deg] w-[27%]",
  "left-[24%] top-[2%] rotate-[3deg] w-[27%]",
  "left-[48%] top-[12%] -rotate-[4deg] w-[27%]",
  "left-[72%] top-[22%] rotate-[9deg] w-[27%]",
];

export type LibraryTab = "tai-lieu" | "video";

const LEADS: Record<LibraryTab, string> = {
  "tai-lieu": "Giáo trình, văn kiện của Đảng và tài liệu tham khảo mà trợ lý dùng để trả lời. Đọc trực tuyến theo từng chương hoặc tải về để học.",
  video: "Bài giảng, video minh họa và phim tư liệu do giảng viên Khoa chọn lọc, gắn với chương học để xem cùng giáo trình.",
};

/** "21:47" hoặc "1:02:05" → số giây; chuỗi khác tính 0. */
function seconds(duration: string | null): number {
  const parts = duration?.split(":").map(Number) ?? [];
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return 0;
  return parts.reduce((a, n) => a * 60 + n, 0);
}

/**
 * Đầu trang Thư viện: nền xanh rừng như hero trang chủ, hai tab Tài liệu và Video, số liệu tổng quát của tab đang mở
 * và vài bìa tài liệu xếp quạt. Bìa lấy mỗi loại một cuốn (giáo trình trước), nên luôn nhiều màu, đổi theo nội dung kho.
 */
export function LibraryHero({ docs, videos, tab = "tai-lieu" }: { docs: LibraryDoc[]; videos: Video[]; tab?: LibraryTab }) {
  const covers = DOC_KINDS.map((k) => docs.find((d) => d.kind === k)).filter((d): d is LibraryDoc => !!d);
  for (const d of docs) if (covers.length < FAN.length && !covers.includes(d)) covers.push(d);
  const pages = docs.reduce((a, d) => a + (d.pages ?? 0), 0);
  const minutes = Math.round(videos.reduce((a, v) => a + seconds(v.duration), 0) / 60);
  const stats =
    tab === "video"
      ? [
          { value: videos.length, label: "Video" },
          { value: new Set(videos.map((v) => v.category)).size, label: "Loại học liệu" },
          { value: minutes, label: "Phút xem" },
        ]
      : [
          { value: docs.length, label: "Tài liệu" },
          { value: new Set(docs.map((d) => d.kind)).size, label: "Loại tài liệu" },
          { value: pages, label: "Trang đọc trực tuyến" },
        ];
  const tabs = [
    { id: "tai-lieu" as const, href: "/thu-vien", label: "Tài liệu", icon: BookOpenText, count: docs.length },
    { id: "video" as const, href: "/thu-vien/video", label: "Video", icon: Clapperboard, count: videos.length },
  ];

  return (
    <section className="mesh-dark relative isolate overflow-hidden text-white">
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute -top-32 right-[10%] -z-10 size-105 rounded-full bg-primary-bright/20 blur-[110px] motion-safe:animate-drift" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-20 sm:pt-12 sm:pb-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <div className="flex flex-col items-start gap-5">
          <Breadcrumb>
            <BreadcrumbList className="text-white/55">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />} className="hover:text-white">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {tab === "video" ? (
                  <BreadcrumbLink render={<Link href="/thu-vien" />} className="hover:text-white">Thư viện</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-white/90">Thư viện</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {tab === "video" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-white/90">Video</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <Badge variant="glass-dark" className="animate-rise text-xs font-medium">Kho học liệu chính thống của Khoa</Badge>
          <h1 className="animate-rise anim-delay-80 text-balance text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            Thư viện <span className="text-gradient motion-safe:animate-gradient-pan">học liệu</span>
          </h1>
          <p className="animate-rise anim-delay-160 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">{LEADS[tab]}</p>

          {/* Hai tab là hai trang riêng (/thu-vien, /thu-vien/video) để mỗi tab có đường dẫn chia sẻ được. */}
          <nav aria-label="Loại học liệu" className="animate-rise anim-delay-200 inline-flex gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur-sm">
            {tabs.map((t) => {
              const active = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-white text-forest shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <t.icon className="size-4" aria-hidden />
                  {t.label}
                  <span className={cn("text-xs tabular-nums", active ? "text-forest/60" : "text-white/45")}>{t.count}</span>
                </Link>
              );
            })}
          </nav>

          <dl className="animate-rise anim-delay-240 mt-2 grid w-full max-w-xl grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl bg-white/6 ring-1 ring-white/10 backdrop-blur-sm">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse justify-end gap-1 px-4 py-3.5 sm:px-5">
                <dt className="text-xs leading-snug text-white/60">{s.label}</dt>
                <dd className="font-heading text-2xl font-bold tabular-nums text-mint sm:text-3xl">{s.value.toLocaleString("vi-VN")}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Bìa xếp quạt; ẩn ở màn hẹp để tiêu đề và số liệu lên đầu. */}
        <div aria-hidden className="relative hidden aspect-2/1 lg:block">
          <div className="absolute inset-x-[8%] bottom-[2%] h-[14%] rounded-[50%] bg-black/35 blur-2xl" />
          {covers.slice(0, FAN.length).map((d, i) => (
            <div
              key={d.slug}
              className={cn("absolute animate-pop-in", FAN[i])}
              style={{ animationDelay: `${200 + i * 90}ms` }}
            >
              <div className="motion-safe:animate-float" style={{ animationDelay: `${i * -1.6}s` }}>
                <DocCover doc={d} className="w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
