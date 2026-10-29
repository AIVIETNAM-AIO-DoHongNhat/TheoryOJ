"use client";

import "katex/dist/katex.min.css";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const CITE_PREFIX = "#cite-";

/**
 * Chuẩn hóa đầu ra của mô hình trước khi render:
 * - \( \) và \[ \] thành $ $ và $$ $$ để remark-math nhận.
 * - [n] thành liên kết #cite-n để thay bằng thẻ trích dẫn.
 */
export function normalize(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`)
    .replace(/(?<!\\)\[(\d{1,2}(?:\s*[,;]\s*\d{1,2})*)\](?!\()/g, (_, list: string) =>
      list.split(/\s*[,;]\s*/).map((n) => `[${n}](${CITE_PREFIX}${n})`).join(""));
}

export function Markdown({
  children,
  renderCitation,
}: {
  children: string;
  renderCitation?: (n: number) => ReactNode;
}) {
  return (
    <div className="prose-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href?.startsWith(CITE_PREFIX) && renderCitation) {
              return renderCitation(Number(href.slice(CITE_PREFIX.length)));
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {normalize(children)}
      </ReactMarkdown>
    </div>
  );
}
