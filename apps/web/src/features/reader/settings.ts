"use client";

import { useCallback, useSyncExternalStore } from "react";

// Cài đặt chế độ đọc dùng chung cho trình đọc PDF và trang bài viết, văn kiện. Lưu trong trình duyệt của từng người,
// không cần tài khoản; không đọc được bộ nhớ (chế độ riêng tư) thì dùng giá trị mặc định, vẫn đọc bình thường.

export const THEMES = ["sang", "giay", "toi"] as const;
export type ReaderTheme = (typeof THEMES)[number];
export const THEME_LABELS: Record<ReaderTheme, string> = { sang: "Sáng", giay: "Vàng giấy", toi: "Tối" };

export const FONTS = ["sans", "serif"] as const;
export type ReaderFont = (typeof FONTS)[number];
export const FONT_LABELS: Record<ReaderFont, string> = { sans: "Không chân", serif: "Có chân" };

export const WIDTHS = ["hep", "vua", "rong"] as const;
export type ReaderWidth = (typeof WIDTHS)[number];
export const WIDTH_LABELS: Record<ReaderWidth, string> = { hep: "Hẹp", vua: "Vừa", rong: "Rộng" };
/** Độ rộng khung chữ theo số ký tự, vừa mắt đọc. */
export const WIDTH_CH: Record<ReaderWidth, number> = { hep: 52, vua: 66, rong: 84 };

/** Cỡ chữ theo bậc, tính bằng px. */
export const SIZES = [15, 16.5, 18, 20, 22, 25] as const;

export interface ReaderSettings {
  theme: ReaderTheme;
  font: ReaderFont;
  width: ReaderWidth;
  /** Chỉ số trong SIZES. */
  size: number;
}

export const DEFAULTS: ReaderSettings = { theme: "sang", font: "sans", width: "vua", size: 2 };

const KEY = "theoryoj:che-do-doc";
const EVENT = "theoryoj:che-do-doc:doi";

function sanitize(v: unknown): ReaderSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const pick = <T extends string>(list: readonly T[], x: unknown, fallback: T) => (list.includes(x as T) ? (x as T) : fallback);
  const size = Number(o.size);
  return {
    theme: pick(THEMES, o.theme, DEFAULTS.theme),
    font: pick(FONTS, o.font, DEFAULTS.font),
    width: pick(WIDTHS, o.width, DEFAULTS.width),
    size: Number.isInteger(size) && size >= 0 && size < SIZES.length ? size : DEFAULTS.size,
  };
}

// getSnapshot phải trả về cùng một đối tượng khi dữ liệu không đổi, nên giữ bản đã phân tích theo chuỗi gốc.
let cache: { raw: string | null; value: ReaderSettings } = { raw: null, value: DEFAULTS };

function read(): ReaderSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Không đọc được thì dùng mặc định.
  }
  if (raw === cache.raw) return cache.value;
  let value = DEFAULTS;
  if (raw) {
    try {
      value = sanitize(JSON.parse(raw));
    } catch {
      // Dữ liệu hỏng: bỏ qua, dùng mặc định.
    }
  }
  cache = { raw, value };
  return value;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Cài đặt hiện tại và hàm đổi. Máy chủ và lần dựng đầu trên trình duyệt dùng mặc định, rồi cập nhật theo bộ nhớ. */
export function useReaderSettings(): [ReaderSettings, (patch: Partial<ReaderSettings>) => void] {
  const settings = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  const update = useCallback((patch: Partial<ReaderSettings>) => {
    const next = sanitize({ ...read(), ...patch });
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Không lưu được thì chỉ đổi trong phiên này.
      cache = { raw: JSON.stringify(next), value: next };
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [settings, update];
}

/** Biến CSS cho khung đọc: cỡ chữ, độ rộng dòng, kiểu chữ. */
export function readerStyle(s: ReaderSettings): React.CSSProperties {
  return {
    "--reader-size": `${SIZES[s.size]}px`,
    "--reader-width": `${WIDTH_CH[s.width]}ch`,
    "--reader-font": s.font === "serif" ? "var(--font-serif-vn), Georgia, serif" : "var(--font-sans)",
  } as React.CSSProperties;
}
