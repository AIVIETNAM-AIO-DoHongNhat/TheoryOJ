"use client";

import { BookAlert, FilePen, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { MinhMascot } from "@/components/brand/MinhMascot";
import { Markdown } from "@/components/markdown/Markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { cn } from "@/lib/utils";

import type { ChatMessage, ChatStatus, Citation } from "../types";
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

function thinkingLabel(status: ChatStatus | undefined, found: number): string {
  if (!status) return "Đang tra cứu giáo trình và văn kiện";
  if (status.intent === "tro_chuyen") return "Đang soạn câu trả lời";
  if (status.intent === "tom_tat") return found ? `Đã đọc ${found} phần tài liệu, đang soạn bản tóm tắt` : "Đang soạn bản tóm tắt";
  if (status.grounding === "kien_thuc_chung") return "Đang soạn câu trả lời";
  return found ? `Đã tìm thấy ${found} đoạn, đang soạn câu trả lời` : "Đang tra cứu giáo trình và văn kiện";
}

const NOTICE: Record<"mot_phan" | "kien_thuc_chung", string> = {
  mot_phan:
    "Giáo trình chỉ đề cập một phần nội dung này. Ý có số trích dẫn lấy từ tài liệu; phần còn lại dựa trên kiến thức chung, đồng chí nên đối chiếu với giảng viên.",
  kien_thuc_chung:
    "Giáo trình và văn kiện hiện có không đề cập trực tiếp nội dung này. Câu trả lời dựa trên kiến thức chung, đồng chí nên đối chiếu với giảng viên.",
};

/** Nhãn do giao diện gắn theo trạng thái máy chủ gửi về, không để mô hình tự viết nên luôn có và không bị bịa. */
function SourceNotice({ status }: { status: ChatStatus | undefined }) {
  const grounding = status?.grounding;
  const lines: { icon: typeof BookAlert; text: string }[] = [];
  if (grounding === "mot_phan" || grounding === "kien_thuc_chung") lines.push({ icon: BookAlert, text: NOTICE[grounding] });
  if (status?.draftSummary) lines.push({ icon: FilePen, text: "Bản tóm tắt dựng từ bản nháp chưa được giảng viên duyệt." });
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 motion-safe:animate-in motion-safe:fade-in">
      {lines.map(({ icon: Icon, text }) => (
        <p
          key={text}
          role="note"
          className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{text}</span>
        </p>
      ))}
    </div>
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
            <SourceNotice status={status} />
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
                <Thinking label={thinkingLabel(status, citations.length)} />
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
