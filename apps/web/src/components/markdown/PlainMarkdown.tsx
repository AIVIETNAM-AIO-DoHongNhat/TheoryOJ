"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { linkComponents, type RendererProps } from "./links";

/** Bản render không công thức, tải riêng qua next/dynamic ở Markdown.tsx. */
export default function PlainMarkdown({ text, renderCitation }: RendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={linkComponents(renderCitation)}>
      {text}
    </ReactMarkdown>
  );
}
