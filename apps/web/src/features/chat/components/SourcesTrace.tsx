"use client";

import { ArrowUpRight, FileText, Library } from "lucide-react";
import Link from "next/link";

import {
  Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { readerHref } from "@/features/library/types";

import { locator } from "../citation";
import type { Citation } from "../types";

/** Nguồn đã dùng để trả lời: đoạn trích và liên kết mở đúng trang trong thư viện. */
export function SourcesTrace({
  citations,
  open,
  expanded,
  onExpandedChange,
  onToggle,
  idPrefix,
}: {
  citations: Citation[];
  open: Set<number>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onToggle: (n: number, isOpen: boolean) => void;
  idPrefix: string;
}) {
  if (citations.length === 0) return null;
  return (
    <Trace>
      <TraceCollapsible open={expanded} onOpenChange={onExpandedChange}>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon><Library /></TraceIcon>
            <TraceTitle>Nguồn tài liệu</TraceTitle>
            <TraceDescription>{citations.length} đoạn</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {citations.map((c) => (
              <div key={c.n} id={`${idPrefix}-${c.n}`} className="scroll-mt-24">
                <TraceCollapsible open={open.has(c.n)} onOpenChange={(isOpen) => onToggle(c.n, isOpen)}>
                  <TraceCollapsibleTrigger>
                    <TraceLine>
                      <TraceIcon><FileText /></TraceIcon>
                      <TraceTitle>[{c.n}] {c.title}</TraceTitle>
                      <TraceDescription>{locator(c)}</TraceDescription>
                    </TraceLine>
                  </TraceCollapsibleTrigger>
                  <TraceCollapsibleContent className="flex flex-col gap-2 text-[13px]">
                    <p className="whitespace-pre-line">{c.text}</p>
                    <Link
                      href={readerHref(c.document, c.pdfPage)}
                      target="_blank"
                      className="flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
                    >
                      Mở trong thư viện
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </TraceCollapsibleContent>
                </TraceCollapsible>
              </div>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
