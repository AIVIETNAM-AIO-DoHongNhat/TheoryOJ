"use client";

import "katex/dist/katex.min.css";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { linkComponents, type RendererProps } from "./links";

/** Bản render có công thức (KaTeX, khoảng 120 KB nén), tải riêng chỉ khi văn bản có `$`. */
export default function MathMarkdown({ text, renderCitation }: RendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
      components={linkComponents(renderCitation)}
    >
      {text}
    </ReactMarkdown>
  );
}
