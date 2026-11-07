import type { ReactNode } from "react";
import type { Components } from "react-markdown";

import { CITE_PREFIX } from "./normalize";

/** Props chung của hai bản render (PlainMarkdown, MathMarkdown). */
export interface RendererProps {
  text: string;
  renderCitation?: (n: number) => ReactNode;
}

/** Liên kết #cite-n thành thẻ trích dẫn; liên kết khác mở tab mới. */
export function linkComponents(renderCitation?: (n: number) => ReactNode): Components {
  return {
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
  };
}
