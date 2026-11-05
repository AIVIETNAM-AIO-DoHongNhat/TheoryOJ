"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { originOf, type Theme, useIsDark, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const THEME_OPTIONS: Record<Theme, { label: string; icon: typeof Sun }> = {
  sang: { label: "Sáng", icon: Sun },
  toi: { label: "Tối", icon: Moon },
  "he-thong": { label: "Thiết bị", icon: Monitor },
};

/**
 * Công tắc sáng/tối ở đầu trang: bấm là đổi sang giao diện còn lại. Chưa bấm lần nào thì theo thiết bị.
 * Vị trí núm và biểu tượng dựa vào lớp .dark (kiểu `dark:`), nên đúng ngay từ lần vẽ đầu, không nhảy khi tải.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [, setTheme] = useTheme();
  const dark = useIsDark();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Giao diện tối"
      title={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      onClick={(e) => setTheme(document.documentElement.classList.contains("dark") ? "sang" : "toi", originOf(e.currentTarget))}
      className={cn(
        "group/theme relative inline-flex h-8 w-[3.75rem] shrink-0 cursor-pointer items-center rounded-full p-1 outline-none",
        // Theo bảng màu xanh lá của trang: sáng là rãnh xanh nhạt, núm trắng; tối là rãnh xanh rừng, núm xanh chủ đạo.
        "bg-primary-soft ring-1 ring-primary/20 ring-inset transition-colors duration-300 hover:ring-primary/40",
        "dark:bg-forest dark:ring-primary/30 dark:hover:ring-primary/50",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {/* Biểu tượng mờ ở phía còn trống của rãnh, gợi ý bấm sẽ sang đâu. */}
      <Moon className="absolute right-2 size-3.5 text-primary/45 transition-opacity duration-300 dark:opacity-0" aria-hidden />
      <Sun className="absolute left-2 size-3.5 text-mint/45 opacity-0 transition-opacity duration-300 dark:opacity-100" aria-hidden />

      <span
        className={cn(
          // Tên view transition riêng để núm trượt mượt từ vị trí cũ sang mới trong lúc cả trang loang màu.
          "relative flex size-6 items-center justify-center rounded-full [view-transition-name:theme-knob] bg-white shadow-[0_1px_3px_rgb(5_46_22/0.25)] ring-1 ring-primary/15",
          "transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-active/theme:scale-90",
          "dark:translate-x-7 dark:bg-primary dark:shadow-[0_0_10px_rgb(34_197_94/0.45)] dark:ring-0",
        )}
      >
        <Sun
          className="absolute size-4 text-primary transition-[opacity,transform] duration-300 dark:scale-50 dark:-rotate-90 dark:opacity-0"
          aria-hidden
        />
        <Moon
          className="absolute size-3.5 scale-50 rotate-90 fill-primary-foreground text-primary-foreground opacity-0 transition-[opacity,transform] duration-300 dark:scale-100 dark:rotate-0 dark:opacity-100"
          aria-hidden
        />
      </span>
    </button>
  );
}
