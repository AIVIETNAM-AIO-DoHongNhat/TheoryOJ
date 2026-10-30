"use client";

import { ShieldAlert } from "lucide-react";
import { useState } from "react";

import { AcademyLogo } from "@/components/brand";
import { Markdown } from "@/components/markdown/Markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";

import type { ChatMessage, Citation } from "../types";
import { CalculatorTrace } from "./CalculatorTrace";
import { CitationChip } from "./CitationChip";
import { FeedbackBar } from "./FeedbackBar";
import { SourcesTrace } from "./SourcesTrace";

function textOf(message: ChatMessage): string {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export interface MessageViewProps {
  message: ChatMessage;
  /** Hiện nút sao chép và đánh giá; tắt khi câu trả lời đang chạy. */
  showActions?: boolean;
  feedback?: 1 | -1;
}

export function MessageView({ message, showActions = false, feedback }: MessageViewProps) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="tinted">
            <BubbleContent className="whitespace-pre-wrap rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px]">{textOf(message)}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }
  return <AssistantMessage message={message} showActions={showActions} feedback={feedback} />;
}

function AssistantMessage({ message, showActions, feedback }: MessageViewProps) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const citations: Citation[] = message.parts.find((p) => p.type === "data-citations")?.data ?? [];
  const status = message.parts.find((p) => p.type === "data-status")?.data;
  const tools = message.parts.filter((p) => p.type === "tool-tinh_ktct");
  const text = textOf(message);
  const byNumber = new Map(citations.map((c) => [c.n, c]));
  const idPrefix = `src-${message.id}`;

  const openCitation = (n: number) => {
    setSourcesExpanded(true);
    setOpen((prev) => new Set(prev).add(n));
    requestAnimationFrame(() =>
      document.getElementById(`${idPrefix}-${n}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };
  const toggle = (n: number, isOpen: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(n);
      else next.delete(n);
      return next;
    });

  return (
    <Message align="start">
      <MessageAvatar className="size-8 self-start border bg-white">
        <AcademyLogo className="size-6 drop-shadow-none" />
      </MessageAvatar>
      <MessageContent className="min-w-0 flex-1 gap-3">
        {status?.refused ? (
          <Alert>
            <ShieldAlert />
            <AlertTitle>Ngoài phạm vi trả lời</AlertTitle>
            <AlertDescription>{text}</AlertDescription>
          </Alert>
        ) : (
          <>
            {tools.length > 0 && <CalculatorTrace parts={tools} />}
            {text && (
              // Câu trả lời không đóng khung, đọc như một trang văn bản.
              <Bubble variant="ghost">
                <BubbleContent className="pt-1 text-[15px] leading-relaxed">
                  <Markdown renderCitation={(n) => <CitationChip citation={byNumber.get(n)} onOpen={openCitation} />}>
                    {text}
                  </Markdown>
                </BubbleContent>
              </Bubble>
            )}
            <SourcesTrace
              citations={citations}
              open={open}
              expanded={sourcesExpanded}
              onExpandedChange={setSourcesExpanded}
              onToggle={toggle}
              idPrefix={idPrefix}
            />
          </>
        )}
        {showActions && <FeedbackBar messageId={message.id} text={text} initial={feedback} />}
      </MessageContent>
    </Message>
  );
}
