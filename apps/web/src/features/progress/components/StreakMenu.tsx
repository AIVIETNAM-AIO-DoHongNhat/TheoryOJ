"use client";

import { ArrowRight, Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { Streak } from "../server/today";
import { STUDIED_EVENT } from "../streak-event";
import { nextMilestone, STREAK_MILESTONES } from "../today";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Hôm nay vừa học xong việc đầu tiên: chuỗi tăng một, ô hôm nay sáng lên. */
function lightUp(s: Streak): Streak {
  if (s.studiedToday) return s;
  const streak = s.streak + 1;
  return {
    streak,
    studiedToday: true,
    best: Math.max(s.best, streak),
    goal: nextMilestone(streak),
    week: s.week.map((d, i) => (i === s.week.length - 1 ? { ...d, studied: true } : d)),
  };
}

function message(s: Streak): string {
  if (s.studiedToday) return s.streak === 1 ? "Đã thắp lửa hôm nay. Mai học tiếp để chuỗi không tắt." : "Đã giữ lửa hôm nay. Hẹn đồng chí ngày mai!";
  if (s.streak) return `Học một chút hôm nay để chuỗi lên ${s.streak + 1} ngày, nếu không chuỗi sẽ về 0.`;
  return "Làm một đề trắc nghiệm, một bài tập hoặc ôn vài thẻ để thắp lửa ngày đầu tiên.";
}

/** Nút ngọn lửa ở đầu trang và bảng chuỗi ngày học: tuần này, mốc kế tiếp, kỷ lục. */
export function StreakMenu({ initial }: { initial: Streak }) {
  const [data, setData] = useState(initial);
  const [prev, setPrev] = useState(initial);
  // Lần vừa thắp lửa, để chạy hiệu ứng bùng lên một lần.
  const [burst, setBurst] = useState(0);
  if (prev !== initial) {
    setPrev(initial);
    setData(initial);
  }

  useEffect(() => {
    // Mỗi lần học xong ngọn lửa đều bùng lên một nhịp; chuỗi chỉ tăng ở việc đầu tiên trong ngày.
    const onStudied = () => {
      setData(lightUp);
      setBurst((b) => b + 1);
    };
    window.addEventListener(STUDIED_EVENT, onStudied);
    return () => window.removeEventListener(STUDIED_EVENT, onStudied);
  }, []);

  const lit = data.studiedToday;
  const atRisk = data.streak > 0 && !lit;
  // Thanh tiến độ tính từ mốc vừa qua tới mốc kế tiếp, để lúc nào cũng thấy đã đi được một đoạn.
  const from = Math.max(0, ...STREAK_MILESTONES.filter((m) => m <= data.streak), Math.floor(data.streak / 100) * 100);
  const ratio = (data.streak - from) / (data.goal - from);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            aria-label={`Chuỗi ${data.streak} ngày học liên tiếp${atRisk ? ", hôm nay chưa học" : ""}`}
            className={cn(
              "relative h-9 gap-1 rounded-full px-2.5 text-[15px] font-bold tabular-nums transition-colors",
              lit
                ? "bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 aria-expanded:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/25 dark:aria-expanded:bg-orange-500/25"
                : "text-muted-foreground hover:bg-muted aria-expanded:bg-muted",
            )}
          />
        }
      >
        <Flame
          key={burst}
          className={cn(
            "size-5 origin-bottom",
            lit ? "fill-orange-400 text-orange-500" : atRisk ? "text-orange-400" : "text-muted-foreground/70",
            burst > 0 && "motion-safe:animate-flame-pop",
          )}
        />
        {data.streak}
        {atRisk && (
          <span className="absolute top-1 right-1 flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full rounded-full bg-orange-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 gap-4 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-linear-to-br from-orange-50 to-amber-50 p-3 dark:from-orange-500/15 dark:to-amber-500/5">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-full",
              lit ? "bg-linear-to-br from-amber-400 to-orange-600 text-white shadow-md shadow-orange-500/30" : "bg-card text-orange-300 ring-1 ring-orange-200 dark:ring-orange-500/30",
            )}
          >
            <Flame className={cn("size-7 origin-bottom", lit && "fill-amber-200 motion-safe:animate-flicker")} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-heading text-3xl leading-none font-bold text-orange-600 tabular-nums dark:text-orange-400">
              {data.streak} <span className="text-base font-semibold">ngày</span>
            </span>
            <span className="mt-1 text-xs text-foreground/75">{message(data)}</span>
          </span>
        </div>

        <ol className="grid grid-cols-7 gap-1 text-center" aria-label="Bảy ngày gần nhất">
          {data.week.map((d, i) => {
            const today = i === data.week.length - 1;
            return (
              <li key={d.day} className="flex flex-col items-center gap-1">
                <span className={cn("text-[11px] font-medium", today ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
                  {today ? "Nay" : WEEKDAY[d.weekday]}
                </span>
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    d.studied ? "bg-orange-500 text-white" : "border border-dashed border-muted-foreground/30",
                    today && "ring-2 ring-orange-300 ring-offset-1 ring-offset-popover dark:ring-orange-500/60",
                  )}
                  aria-label={`${d.day}: ${d.studied ? "có học" : "chưa học"}`}
                >
                  {d.studied && <Flame className="size-4 fill-amber-200" />}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium">Mốc tiếp theo: {data.goal} ngày</span>
            <span className="text-muted-foreground">còn {data.goal - data.streak} ngày</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-500/15">
            <div className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-[width] duration-700" style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="size-4 text-amber-500" />
            Kỷ lục: <span className="font-semibold text-foreground">{data.best} ngày</span>
          </span>
          <Button size="sm" render={<Link href="/hoc" />} nativeButton={false} variant={lit ? "outline" : "default"}>
            {lit ? "Xem việc hôm nay" : "Học ngay"}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
