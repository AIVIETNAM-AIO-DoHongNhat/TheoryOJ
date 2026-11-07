"use client";

import { lazy, memo, type ReactNode, Suspense } from "react";

import { hasMath, normalize } from "./normalize";

export { normalize } from "./normalize";

// Bộ render Markdown (react-markdown) và KaTeX tải theo nhu cầu: trang trợ lý chưa có câu trả lời thì không tải gì,
// câu trả lời không có công thức thì không tải KaTeX. Trong lúc tải hiện chữ thô để trang không trống, không nhảy.
const PlainMarkdown = lazy(() => import("./PlainMarkdown"));
const MathMarkdown = lazy(() => import("./MathMarkdown"));

/**
 * `chat` (mặc định) chuẩn hóa đầu ra của mô hình (normalize.ts). `notes` (sổ ghi chép) để nguyên chữ của học viên:
 * công thức viết bằng `$`, còn `[1]` hay `\[` là chữ thường.
 * Bọc `memo`: hội thoại dài chỉ dựng lại câu đang chạy, không phân tích lại Markdown, công thức của mọi câu cũ.
 */
export const Markdown = memo(function Markdown({
  children,
  renderCitation,
  variant = "chat",
}: {
  children: string;
  renderCitation?: (n: number) => ReactNode;
  variant?: "chat" | "notes";
}) {
  const text = variant === "chat" ? normalize(children) : children;
  const Renderer = hasMath(text) ? MathMarkdown : PlainMarkdown;
  return (
    <div className="prose-answer">
      <Suspense fallback={<div className="whitespace-pre-wrap">{children}</div>}>
        <Renderer text={text} renderCitation={renderCitation} />
      </Suspense>
    </div>
  );
});
