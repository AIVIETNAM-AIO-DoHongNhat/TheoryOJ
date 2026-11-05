"use client";

import { ChartColumn } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface OutlineItem {
  id: string;
  /** Nhãn ngắn trên thanh di động, ví dụ "Tổng quan" hay "Chương 3". */
  short: string;
  label: string;
  /** Có số thì là một chương, nằm lùi vào dưới mục "Ôn theo chương". */
  number?: number;
}

/** Khoảng cách từ mép trên cửa sổ tới vạch xác định phần đang xem, tính cả đầu trang dính. */
const SPY_OFFSET = 160;

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) current = id;
      }
      // Cuộn chạm đáy trang thì phần cuối là phần đang xem dù chưa qua vạch.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}

/**
 * Mục lục ba tầng của một môn: môn, phần, chương. Tô đậm phần đang xem theo vị trí cuộn.
 * Trả về hai phần tử anh em để cả hai cùng dính được trong lưới cha: thanh ngang trên màn hình hẹp và cột trái trên màn hình rộng.
 */
export function ReviewOutline({ subject, subjectName, items }: { subject: string; subjectName: string; items: OutlineItem[] }) {
  const [ids] = useState(() => items.map((i) => i.id));
  const active = useActiveSection(ids);
  const current = items.find((i) => i.id === active) ?? items[0];
  const chapters = items.filter((i) => i.number !== undefined);
  const sections = items.filter((i) => i.number === undefined);
  const chapterIndex = chapters.findIndex((c) => c.id === active);

  // Thanh ngang: kéo chip đang chọn vào tầm nhìn, chỉ cuộn ngang để không làm trang nhảy.
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = strip.current;
    const chip = box?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!box || !chip) return;
    const left = chip.offsetLeft - box.clientWidth / 2 + chip.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  const position = chapterIndex >= 0 ? `Chương ${chapterIndex + 1}/${chapters.length}` : current.short;

  return (
    <>
      {/* Màn hình hẹp: dòng "đang xem" và dãy chip nhảy nhanh. */}
      <nav aria-label="Các phần của trang" className="sticky top-19 z-20 -mx-4 border-y bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85 lg:hidden">
        <p className="flex items-baseline gap-2 px-4 pt-2.5 text-xs" aria-live="polite">
          <span className="shrink-0 font-semibold uppercase tracking-[0.14em] text-primary">{subject}</span>
          <span className="text-muted-foreground" aria-hidden>›</span>
          <span className="truncate font-medium text-foreground">
            {chapterIndex >= 0 ? `${position} · ${current.label}` : current.label}
          </span>
        </p>
        <div ref={strip} className="flex gap-1.5 overflow-x-auto px-4 pt-2 pb-2.5 scrollbar-none">
          {items.map((i) => (
            <a
              key={i.id}
              href={`#${i.id}`}
              data-id={i.id}
              aria-current={i.id === active ? "location" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                i.id === active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {i.number !== undefined ? String(i.number).padStart(2, "0") : i.short}
            </a>
          ))}
        </div>
      </nav>

      {/* Màn hình rộng: cột mục lục dính bên trái. */}
      <aside className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] self-start overflow-y-auto lg:block" aria-label="Mục lục ôn tập">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 rounded-xl border bg-subtle p-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Đang xem</span>
            <span className="text-sm font-semibold leading-snug">{subjectName}</span>
            <span className="text-xs font-medium text-primary" aria-live="polite">{position}</span>
            <div className="mt-1 flex gap-1" aria-hidden>
              {chapters.map((c, n) => (
                <span key={c.id} className={cn("h-1 flex-1 rounded-full transition-colors", n <= chapterIndex ? "bg-primary" : "bg-border")} />
              ))}
            </div>
          </div>

          <nav className="flex flex-col gap-0.5 text-sm">
            {sections.map((s) => (
              <OutlineLink key={s.id} item={s} active={s.id === active} />
            ))}
            {sections.length === 0 && (
              <span className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Các chương</span>
            )}
            {/* Tầng chương: có đường dọc bên trái; nằm dưới các mục khác thì lùi vào để thấy là tầng con. */}
            <ol className={cn("flex flex-col gap-0.5 border-l pl-2", sections.length > 0 && "mt-1 ml-3")}>
              {chapters.map((c) => (
                <li key={c.id}>
                  <OutlineLink item={c} active={c.id === active} />
                </li>
              ))}
            </ol>
          </nav>

          <Link href="/tien-do" className="flex items-center gap-2 self-start text-xs font-medium text-muted-foreground hover:text-primary">
            <ChartColumn className="size-3.5" aria-hidden />
            Xem tiến độ của tôi
          </Link>
        </div>
      </aside>
    </>
  );
}

function OutlineLink({ item, active }: { item: OutlineItem; active: boolean }) {
  return (
    <a
      href={`#${item.id}`}
      aria-current={active ? "location" : undefined}
      className={cn(
        "relative flex gap-2.5 rounded-md px-2.5 py-1.5 leading-snug transition-colors",
        active ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-subtle hover:text-foreground",
        item.number !== undefined && "text-[13px]",
      )}
    >
      {active && item.number !== undefined && <span className="absolute inset-y-1.5 -left-[calc(0.5rem+1.5px)] w-0.5 rounded-full bg-primary" aria-hidden />}
      {item.number !== undefined && (
        <span className={cn("shrink-0 font-heading font-bold tabular-nums", active ? "text-primary" : "text-foreground/40")}>
          {String(item.number).padStart(2, "0")}
        </span>
      )}
      <span className="line-clamp-2">{item.label}</span>
    </a>
  );
}
