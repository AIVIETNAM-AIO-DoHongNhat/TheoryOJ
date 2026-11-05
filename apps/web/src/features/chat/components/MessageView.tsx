"use client";

import { ShieldAlert } from "lucide-react";
import { useState } from "react";

import { MinhMascot } from "@/components/brand/MinhMascot";
import { Markdown } from "@/components/markdown/Markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { cn } from "@/lib/utils";

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
  /** Câu trả lời cuối: thanh hành động luôn hiện, các câu cũ hơn chỉ hiện khi rê chuột. */
  latest?: boolean;
  /** Câu trả lời đang chạy: vòng sáng quanh ảnh đại diện và con trỏ cuối chữ. */
  streaming?: boolean;
  /** Tin nhắn vừa gửi trong phiên này (không phải tải lại từ lịch sử) thì trồi lên. */
  animate?: boolean;
  feedback?: 1 | -1;
}

export function MessageView({ message, animate = false, ...rest }: MessageViewProps) {
  if (message.role === "user") {
    return (
      <Message align="end" className={cn(animate && "origin-bottom-right motion-safe:animate-msg-in-end")}>
        <MessageContent>
          <Bubble align="end" variant="tinted">
            <BubbleContent className="whitespace-pre-wrap rounded-3xl rounded-br-md px-4 py-2.5 text-[15px] shadow-[0_1px_2px_rgb(5_46_22/0.06)]">
              {textOf(message)}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }
  return <AssistantMessage message={message} {...rest} />;
}

/** Ảnh đại diện của trợ lý: linh vật Minh. Khi đang trả lời có vòng sáng lan ra để báo hệ thống còn làm việc. */
export function AssistantAvatar({ active = false }: { active?: boolean }) {
  return (
    <div className="relative size-8 shrink-0 self-start">
      {active && (
        <span aria-hidden className="absolute inset-0 rounded-full bg-primary/25 motion-safe:animate-halo" />
      )}
      <div
        className={cn(
          "relative flex size-8 items-center justify-center rounded-full border bg-card shadow-xs transition-[border-color,box-shadow] duration-300",
          active && "border-primary/40 shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_12%,transparent)]",
        )}
      >
        <MinhMascot compact className="size-7" />
      </div>
    </div>
  );
}

/** Ba chấm nhấp nhô kèm dòng chữ ánh sáng chạy qua, dùng khi chưa có chữ nào của câu trả lời. */
export function Thinking({ label }: { label: string }) {
  return (
    <div role="status" className="flex h-8 items-center gap-2.5 text-sm text-muted-foreground">
      <span aria-hidden className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-primary motion-safe:animate-typing"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="shimmer motion-reduce:shimmer-none">{label}</span>
    </div>
  );
}

/** Dòng "đang tra cứu" trước khi máy chủ gửi về phần đầu tiên của câu trả lời. */
export function PendingReply() {
  return (
    <Message align="start" className="gap-3 motion-safe:animate-msg-in">
      <AssistantAvatar active />
      <MessageContent className="min-w-0 flex-1">
        <Thinking label="Đang tra cứu giáo trình và văn kiện" />
      </MessageContent>
    </Message>
  );
}

function AssistantMessage({ message, showActions, latest, streaming, feedback }: Omit<MessageViewProps, "animate">) {
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
    <Message align="start" className="gap-3">
      <AssistantAvatar active={streaming} />
      <MessageContent className="min-w-0 flex-1 gap-3">
        {status?.refused ? (
          <Alert className="motion-safe:animate-in motion-safe:fade-in">
            <ShieldAlert />
            <AlertTitle>Ngoài phạm vi trả lời</AlertTitle>
            <AlertDescription>{text}</AlertDescription>
          </Alert>
        ) : (
          <>
            {tools.length > 0 && <CalculatorTrace parts={tools} />}
            {text ? (
              // Câu trả lời không đóng khung, đọc như một trang văn bản.
              <Bubble variant="ghost">
                <BubbleContent className={cn("pt-1 text-[15px] leading-relaxed", streaming && "chat-streaming")}>
                  <Markdown renderCitation={(n) => <CitationChip citation={byNumber.get(n)} onOpen={openCitation} />}>
                    {text}
                  </Markdown>
                </BubbleContent>
              </Bubble>
            ) : (
              streaming && tools.length === 0 && (
                <Thinking label={citations.length ? `Đã tìm thấy ${citations.length} đoạn, đang soạn câu trả lời` : "Đang tra cứu giáo trình và văn kiện"} />
              )
            )}
            {citations.length > 0 && (
              <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
                <SourcesTrace
                  citations={citations}
                  open={open}
                  expanded={sourcesExpanded}
                  onExpandedChange={setSourcesExpanded}
                  onToggle={toggle}
                  idPrefix={idPrefix}
                />
              </div>
            )}
          </>
        )}
        {showActions && (
          <div
            className={cn(
              "transition-opacity duration-200 motion-safe:animate-in motion-safe:fade-in",
              // Câu cũ: ẩn trên màn hình có chuột, hiện khi rê vào hoặc khi bấm phím Tab tới.
              !latest && "pointer-fine:opacity-0 pointer-fine:group-hover/message:opacity-100 pointer-fine:focus-within:opacity-100 pointer-fine:has-[[aria-expanded=true]]:opacity-100",
            )}
          >
            <FeedbackBar messageId={message.id} text={text} initial={feedback} />
          </div>
        )}
      </MessageContent>
    </Message>
  );
}
