"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Hiện dần khối nội dung khi cuộn tới. Không có JavaScript thì nội dung vẫn hiện nhờ khối noscript ở layout.tsx.
 * Độ trễ được ghi cả vào biến `--reveal-delay` để ảnh `.reveal-mask` bên trong hé mở cùng nhịp.
 */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
