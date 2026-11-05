"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Số đếm từ 0 lên khi cuộn tới, ví dụ "40+" chạy từ "0+" đến "40+". Giá trị không bắt đầu bằng chữ số thì hiện nguyên văn.
 * Lúc render phía máy chủ và khi giảm chuyển động, hiện ngay giá trị cuối.
 */
export function CountUp({ value, duration = 1400, className }: { value: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const match = /^(\d+)(.*)$/.exec(value);
  const target = match ? Number(match[1]) : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || target === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setCurrent(Math.round(target * (1 - (1 - t) ** 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className={className}>
      {match && current !== null ? `${current}${match[2]}` : value}
    </span>
  );
}
