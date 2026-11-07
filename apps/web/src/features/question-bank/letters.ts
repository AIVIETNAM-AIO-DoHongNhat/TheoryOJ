// Hằng số phương án dùng chung, tách khỏi schema.ts (có zod) để trang chỉ cần chữ cái phương án không phải tải zod.

export const LETTERS = "ABCDEF";
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = LETTERS.length;
