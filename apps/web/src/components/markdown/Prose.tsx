import "katex/dist/katex.min.css";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { cn } from "@/lib/utils";

/** Văn bản dài render ở server: toàn văn văn kiện, bài viết. Khác `Markdown` dùng cho câu trả lời của trợ lý. */
export function Prose({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-doc", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** HTML dựng sẵn ở server từ file tin cậy (DOCX qua mammoth). */
export function ProseHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn("prose-doc", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
