"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SHOW_AFTER = 480;
const R = 22;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Nút về đầu trang, kèm vòng tròn thể hiện tiến độ cuộn. Đặt trong cụm nút nổi `FloatingActions`. */
export function ScrollToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      setVisible(window.scrollY > SHOW_AFTER);
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
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={cn(
        // Khi ẩn thì thu chiều cao về 0 để nút Trợ lý phía trên hạ xuống sát góc.
        "transition-all duration-300",
        visible ? "h-12 translate-y-0 opacity-100" : "pointer-events-none h-0 translate-y-4 opacity-0",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Về đầu trang"
              tabIndex={visible ? 0 : -1}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="relative size-12 rounded-full bg-white shadow-md"
            />
          }
        >
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden>
            <circle cx="24" cy="24" r={R} fill="none" stroke="var(--primary-tint)" strokeWidth="2.5" />
            <circle
              cx="24"
              cy="24"
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <ArrowUp data-icon="inline-start" className="text-primary" />
        </TooltipTrigger>
        <TooltipContent side="left">Về đầu trang</TooltipContent>
      </Tooltip>
    </div>
  );
}
