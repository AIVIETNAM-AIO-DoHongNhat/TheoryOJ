import { ArrowRight, CalendarDays, Flag, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { Overview } from "../server/stats";

function greeting(now: Date) {
  const h = Number(now.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" }));
  return h < 11 ? "Chào buổi sáng" : h < 13 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

/**
 * Đầu trang Tổng quan: lời chào theo buổi, ngày hôm nay, một câu tóm tắt việc cần làm và hai lối tắt; bên phải là
 * thẻ hồ sơ của người đang đăng nhập. Nền xanh rừng có lưới mảnh như phần đầu trang chủ.
 * `avatarUrl`: bảng users chưa có cột ảnh đại diện nên hiện chưa truyền; khi không có ảnh thì vẽ hình người dùng.
 */
export function AdminHero({ name, avatarUrl, overview: o, now }: { name: string; avatarUrl?: string | null; overview: Overview; now: Date }) {
  const today = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

  return (
    <section className="mesh-dark relative isolate overflow-hidden rounded-3xl text-white shadow-[0_24px_60px_-30px_rgb(5_46_22/0.6)]">
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />
      {/* Vệt sáng dạt chậm phía sau chữ. */}
      <div
        className="pointer-events-none absolute -top-24 -left-20 -z-10 size-80 rounded-full bg-primary-bright/20 blur-3xl motion-safe:animate-drift"
        aria-hidden
      />

      <div className="grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:py-7 lg:pr-7">
        <div className="flex min-w-0 flex-col gap-5">
          <span className="glass-dark inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium text-white/80">
            <CalendarDays className="size-3.5 text-mint" />
            <span className="inline-block first-letter:uppercase">{today}</span>
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              {greeting(now)},{" "}
              <span className="text-gradient motion-safe:animate-gradient-pan">{name}</span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-pretty text-white/70 sm:text-[15px]">
              {o.active7 > 0 ? `${o.active7} người đã ôn tập trong 7 ngày qua, ` : "Chưa có ai ôn tập trong 7 ngày qua, "}
              {o.toReview > 0
                ? `và có ${o.toReview} câu trả lời của trợ lý đang chờ đồng chí xem.`
                : "và không còn câu trả lời nào cần xem. Mọi thứ đang ổn."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {o.toReview > 0 ? (
              <Button
                render={<Link href="/quan-tri/hoi-dap" />}
                nativeButton={false}
                className="h-10 rounded-full bg-mint px-5 text-forest hover:bg-mint/90"
              >
                <Flag data-icon="inline-start" />
                Xem {o.toReview} câu cần xem
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <Button
                render={<Link href="/quan-tri/lop" />}
                nativeButton={false}
                className="h-10 rounded-full bg-mint px-5 text-forest hover:bg-mint/90"
              >
                <Sparkles data-icon="inline-start" />
                Xem kết quả theo lớp
                <ArrowRight data-icon="inline-end" />
              </Button>
            )}
            <Button
              variant="ghost"
              render={<Link href="/quan-tri/hoc-vien" />}
              nativeButton={false}
              className="glass-dark h-10 rounded-full px-5 text-white hover:bg-white/10 hover:text-white"
            >
              <Users data-icon="inline-start" />
              Danh sách học viên
            </Button>
          </div>
        </div>

        {/* Thẻ hồ sơ người đang đăng nhập, nghiêng nhẹ. Chưa có ảnh thì vẽ hình người dùng. Ẩn trên màn hình hẹp. */}
        <div className="relative mr-4 hidden h-60 w-52 rotate-3 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 lg:block">
          {avatarUrl ? (
            <>
              <Image src={avatarUrl} alt={name} fill sizes="208px" className="object-cover object-top" />
              <div className="absolute inset-0 bg-linear-to-t from-forest/85 via-forest/10 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-white/14 to-white/4">
              <div className="grid-lines absolute inset-0 bg-size-[20px_20px]" />
              <span className="absolute top-9 left-1/2 grid size-28 -translate-x-1/2 place-items-center rounded-full bg-mint/12 ring-1 ring-mint/30">
                <UserRound className="size-14 text-mint" strokeWidth={1.4} aria-hidden />
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4">
            <span className="truncate font-heading text-base font-bold">{name}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/65">
              <ShieldCheck className="size-3.5 text-mint" />
              Giảng viên · Quản trị
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
