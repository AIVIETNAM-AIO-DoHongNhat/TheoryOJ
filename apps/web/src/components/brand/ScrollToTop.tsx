"use client";

import { ArrowUp } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SHOW_AFTER = 480;
const R = 22;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Nút về đầu trang, kèm vòng tròn thể hiện tiến độ cuộn. Mặc định theo cuộn của cả trang (cụm nút nổi `FloatingActions`);
 * truyền `target` để theo một vùng cuộn riêng, như vùng nội dung của trang quản trị.
 */
export function ScrollToTop({ target }: { target?: RefObject<HTMLElement | null> }) {
  // Tiến độ cuộn ghi thẳng vào vòng tròn qua ref, không qua state: cuộn trang không làm React dựng lại mỗi khung hình.
  const ring = useRef<SVGCircleElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = target?.current ?? null;
    const scroller: HTMLElement | Window = el ?? window;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = el ? el.scrollTop : window.scrollY;
      const max = el ? el.scrollHeight - el.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, top / max) : 0;
      ring.current?.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * (1 - progress)));
      // Cùng giá trị thì React bỏ qua, nên chỉ dựng lại khi nút chuyển giữa ẩn và hiện.
      setVisible(top > SHOW_AFTER);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [target]);

  const toTop = () => (target?.current ?? window).scrollTo({ top: 0, behavior: "smooth" });

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
              onClick={toTop}
              className="relative size-12 rounded-full bg-card shadow-md"
            />
          }
        >
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden>
            <circle cx="24" cy="24" r={R} fill="none" stroke="var(--primary-tint)" strokeWidth="2.5" />
            <circle
              ref={ring}
              cx="24"
              cy="24"
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE}
            />
          </svg>
          <ArrowUp data-icon="inline-start" className="text-primary" />
        </TooltipTrigger>
        <TooltipContent side="left">Về đầu trang</TooltipContent>
      </Tooltip>
    </div>
  );
}
