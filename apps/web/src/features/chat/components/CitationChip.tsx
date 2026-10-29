"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { locator } from "../citation";
import type { Citation } from "../types";

/** Trích dẫn trong câu: rê chuột để xem đoạn gốc, bấm để mở nguồn trong danh sách bên dưới. */
export function CitationChip({ citation, onOpen }: { citation?: Citation; onOpen: (n: number) => void }) {
  if (!citation) return null;
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <Button
            variant="secondary"
            size="xs"
            onClick={() => onOpen(citation.n)}
            aria-label={`Nguồn ${citation.n}: ${citation.title}, ${locator(citation)}`}
            className="mx-0.5 h-5 rounded-md px-1.5 align-baseline text-[11px] text-primary"
          />
        }
      >
        {citation.n}
        {citation.page ? <span className="font-normal opacity-75">tr. {citation.page}</span> : null}
      </HoverCardTrigger>
      <HoverCardContent className="flex w-80 flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="size-4 text-primary" />
          {citation.title}
        </div>
        <p className="text-xs text-muted-foreground">{locator(citation)}</p>
        <p className="line-clamp-6 text-xs leading-relaxed">{citation.text}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
