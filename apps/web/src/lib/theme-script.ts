// Tách khỏi lib/theme.ts (module client) để layout phía máy chủ nhúng được chuỗi này.

export const THEME_KEY = "theoryoj:giao-dien";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Chạy đồng bộ trong <head>, trước khi vẽ trang, để gắn lớp .dark mà không nháy trắng.
 * Phải tự đủ (không gọi hàm ngoài) vì được nhúng dạng chuỗi. Chưa chọn thì theo hệ thống.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=t==="toi"||(t!=="sang"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;
