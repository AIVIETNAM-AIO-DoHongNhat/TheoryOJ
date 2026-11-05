"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DARK_QUERY as QUERY, THEME_KEY as KEY } from "./theme-script";

// Giao diện sáng/tối của cả trang. Lưu trong trình duyệt của từng người; "he-thong" đi theo cài đặt máy.
// Lớp .dark được gắn lên <html> bằng THEME_SCRIPT (theme-script.ts) trước khi trang hiện, nên không nháy trắng khi tải.

export const THEMES = ["sang", "toi", "he-thong"] as const;
export type Theme = (typeof THEMES)[number];

const EVENT = "theoryoj:giao-dien:doi";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t as Theme) ? (t as Theme) : "he-thong";
  } catch {
    return "he-thong";
  }
}

function apply(theme: Theme) {
  const dark = theme === "toi" || (theme === "he-thong" && matchMedia(QUERY).matches);
  const root = document.documentElement;
  // Tắt transition trong một khung hình để mọi thành phần đổi màu cùng lúc, không chạy hiệu ứng lệch nhau.
  // Chuyển động khi đổi (loang màu, núm công tắc trượt) do view transition lo, xem applyAnimated.
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}

function subscribe(onChange: () => void) {
  const media = matchMedia(QUERY);
  const onSystem = () => {
    if (readTheme() === "he-thong") apply("he-thong");
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    apply(readTheme());
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onSystem);
  };
}

/** Trang có đang tối thật không (đã tính cả "theo thiết bị"). Máy chủ chưa biết nên trả false ở lần dựng đầu. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => false);
}

/** Điểm bắt đầu hiệu ứng loang, thường là tâm nút vừa bấm (tọa độ khung nhìn). */
export interface ThemeOrigin {
  x: number;
  y: number;
}

/**
 * Kiểu cho view transition lúc đổi giao diện: tắt hiệu ứng mờ dần mặc định của cả trang để chỉ còn vòng loang,
 * và cho núm công tắc (theme-knob) trượt cùng nhịp. Chèn bằng JS trong lúc chuyển rồi gỡ ra, vì bộ xử lý CSS
 * của Turbopack bỏ mất các bộ chọn ::view-transition-* nếu viết trong globals.css; gỡ ra cũng giúp không ảnh hưởng
 * view transition khác.
 */
const TRANSITION_CSS = `
::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}
::view-transition-group(theme-knob){animation-duration:.5s;animation-timing-function:cubic-bezier(.2,.7,.2,1)}
::view-transition-old(theme-knob),::view-transition-new(theme-knob){animation-duration:.5s}`;

/**
 * Đổi giao diện kèm hiệu ứng: giao diện mới loang thành vòng tròn từ `origin` phủ cả trang (View Transitions API).
 * Trình duyệt chưa hỗ trợ, người dùng bật giảm chuyển động, hoặc giao diện không đổi thì đổi ngay.
 */
function applyAnimated(theme: Theme, origin?: ThemeOrigin) {
  const root = document.documentElement;
  const dark = theme === "toi" || (theme === "he-thong" && matchMedia(QUERY).matches);
  if (
    typeof document.startViewTransition !== "function" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    dark === root.classList.contains("dark")
  ) {
    apply(theme);
    return;
  }

  const x = origin?.x ?? innerWidth / 2;
  const y = origin?.y ?? 0;
  // Bán kính tới góc xa nhất, để vòng tròn phủ kín khung nhìn.
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const style = document.createElement("style");
  style.textContent = TRANSITION_CSS;
  document.head.appendChild(style);
  const transition = document.startViewTransition(() => apply(theme));
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => style.remove());
}

/** Giao diện đã chọn và hàm đổi. Máy chủ chưa biết lựa chọn nên trả "he-thong" ở lần dựng đầu. */
export function useTheme(): [Theme, (t: Theme, origin?: ThemeOrigin) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "he-thong" as const);
  const setTheme = useCallback((t: Theme, origin?: ThemeOrigin) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // Không lưu được thì chỉ đổi trong phiên này.
    }
    applyAnimated(t, origin);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [theme, setTheme];
}

/** Tâm của phần tử vừa bấm, dùng làm điểm loang; bấm bằng bàn phím cũng đúng vì không dựa vào tọa độ chuột. */
export function originOf(el: Element): ThemeOrigin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
