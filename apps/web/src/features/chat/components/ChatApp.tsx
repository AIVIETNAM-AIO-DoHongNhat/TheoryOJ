"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, ArrowUpRight, CircleAlert, GraduationCap, RotateCcw, Square, SquarePen } from "lucide-react";
import { useState } from "react";

import { AcademyLogo } from "@/components/brand";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { type Chapter, getSubject } from "@/config/subjects";
import type { Suggestion } from "@/features/learning/types";
import { cn } from "@/lib/utils";

import { MODE_ICONS } from "../mode-icons";
import { MODES, type ModeId } from "../modes";
import type { ChatMessage } from "../types";
import { ChapterMenu, ModeMenu, SubjectMenu } from "./ChatControls";
import { HistorySheet } from "./HistorySheet";
import { MessageView, PendingReply } from "./MessageView";

const MAX_QUESTION = 1500;

export interface ChatAppProps {
  initialSubject: string;
  initialMode: ModeId;
  initialChapters: number[];
  initialQuestion: string;
  /** Câu gợi ý ở màn hình trống, theo từng môn đang mở (content/<môn>/tro-ly.yaml). */
  suggestions: Record<string, Suggestion[]>;
  /** Có khi mở lại hội thoại đã lưu (/tro-ly/[id]). */
  conversation?: {
    id: string;
    messages: ChatMessage[];
    feedback: Record<string, 1 | -1>;
  };
}

/**
 * Vỏ của trợ lý. "Hội thoại mới" hay đổi môn giữa chừng thì dựng lại khung chat với id mới,
 * thay vì xóa tin nhắn: hội thoại cũ đã được lưu và vẫn mở lại được từ Lịch sử.
 */
export function ChatApp(props: ChatAppProps) {
  const [run, setRun] = useState({ key: 0, subject: props.initialSubject, fresh: false });
  const newChat = (subject = run.subject) => {
    window.history.replaceState(null, "", "/tro-ly");
    setRun((r) => ({ key: r.key + 1, subject, fresh: true }));
  };
  return (
    <ChatWindow
      key={run.key}
      initialSubject={run.subject}
      initialMode={props.initialMode}
      initialChapters={run.fresh ? [] : props.initialChapters}
      initialQuestion={run.fresh ? "" : props.initialQuestion}
      suggestions={props.suggestions}
      conversation={run.fresh ? undefined : props.conversation}
      onNewChat={newChat}
    />
  );
}

interface ChatWindowProps extends ChatAppProps {
  onNewChat: (subject?: string) => void;
}

/**
 * Khung trợ lý một cột ở giữa. Chưa có tin nhắn thì ô nhập nằm giữa màn hình kèm câu hỏi gợi ý;
 * có tin nhắn thì hội thoại cuộn ở trên, ô nhập neo ở đáy. Môn, chế độ và chương chọn ngay trong ô nhập.
 */
function ChatWindow(props: ChatWindowProps) {
  const [subjectId, setSubjectId] = useState(props.initialSubject);
  const subject = getSubject(subjectId)!;
  const [mode, setMode] = useState<ModeId>(subject.modes.includes(props.initialMode) ? props.initialMode : subject.modes[0]);
  const [chapters, setChapters] = useState<number[]>(props.initialChapters);
  const [input, setInput] = useState(props.initialQuestion);
  // Tin nhắn tải lại từ lịch sử đứng yên; chỉ tin gửi trong phiên này mới có hiệu ứng trồi lên.
  const [initialCount] = useState(props.conversation?.messages.length ?? 0);
  const { id, messages, sendMessage, regenerate, status, stop, error } = useChat<ChatMessage>({
    id: props.conversation?.id,
    messages: props.conversation?.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const body = { subject: subjectId, mode, chapters };
  const empty = messages.length === 0;
  const suggestions = props.suggestions[subjectId] ?? [];
  const feedback = props.conversation?.feedback ?? {};

  // Hội thoại gắn với một môn: đổi môn khi đã có tin nhắn thì mở hội thoại mới.
  const changeSubject = (next: string) => {
    if (next === subjectId) return;
    if (!empty) return props.onNewChat(next);
    const s = getSubject(next)!;
    setSubjectId(next);
    setChapters([]);
    if (!s.modes.includes(mode)) setMode(s.modes[0]);
  };

  const send = (text: string, sendMode: ModeId = mode) => {
    const question = text.trim();
    if (!question || busy) return;
    if (sendMode !== mode) setMode(sendMode);
    // Câu hỏi đầu tiên tạo hội thoại: đổi địa chỉ để tải lại trang vẫn mở đúng hội thoại.
    if (empty) window.history.replaceState(null, "", `/tro-ly/${id}`);
    sendMessage({ text: question }, { body: { ...body, mode: sendMode } });
    setInput("");
  };

  const composer = (
    <Composer
      input={input}
      onInput={setInput}
      onSend={() => send(input)}
      onStop={stop}
      busy={busy}
      subject={subjectId}
      onSubject={changeSubject}
      modes={subject.modes}
      mode={mode}
      onMode={setMode}
      chapterList={subject.chapters}
      chapters={chapters}
      onChapters={setChapters}
      large={empty}
    />
  );

  const topBar = (
    <div className="relative z-10 border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <HistorySheet currentId={empty ? undefined : id} onNewChat={() => props.onNewChat()} />
          {!empty && (
            <span className="flex min-w-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80 motion-safe:animate-in motion-safe:fade-in">
              <span className="relative flex size-2 shrink-0">
                {busy && <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-halo" />}
                <span className={cn("relative size-2 rounded-full transition-colors", busy ? "bg-primary" : "bg-primary/45")} />
              </span>
              <span className="truncate">{subject.name}</span>
              <span className="sr-only" aria-live="polite">{busy ? "Đang trả lời" : ""}</span>
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => props.onNewChat()} disabled={busy || empty}>
          <SquarePen data-icon="inline-start" />
          <span className="max-sm:sr-only">Hội thoại mới</span>
        </Button>
      </div>
    </div>
  );

  if (empty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {topBar}
        <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Quầng sáng xanh nhạt sau phần tiêu đề, không bắt chuột. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-112 bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_13%,transparent),transparent_75%)]"
          />
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative motion-safe:animate-pop-in">
                <span aria-hidden className="absolute inset-1 rounded-full bg-primary/25 blur-xl" />
                <AcademyLogo className="relative size-16 drop-shadow-none motion-safe:animate-float" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur motion-safe:animate-rise anim-delay-80">
                <GraduationCap className="size-3.5 text-primary" />
                Trợ lý ôn tập · {subject.shortName}
              </span>
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl motion-safe:animate-rise anim-delay-140">
                Đồng chí muốn ôn tập nội dung nào?
              </h1>
              <p className="max-w-xl text-pretty text-muted-foreground motion-safe:animate-rise anim-delay-200">
                Câu trả lời chỉ dựa trên giáo trình và văn kiện môn {subject.name}, kèm số trang để đối chiếu.
              </p>
            </div>
            <div className="motion-safe:animate-rise anim-delay-260">{composer}</div>
            {suggestions.length > 0 && (
              <div key={subjectId} className="flex flex-col gap-2.5">
                <p className="px-1 text-xs font-medium text-muted-foreground motion-safe:animate-rise anim-delay-320">Gợi ý để bắt đầu</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s, i) => {
                    const Icon = MODE_ICONS[s.mode];
                    return (
                      <button
                        key={s.text}
                        type="button"
                        onClick={() => send(s.text, s.mode)}
                        style={{ animationDelay: `${360 + i * 60}ms` }}
                        className="group relative flex items-start gap-3 rounded-2xl border bg-card p-3.5 pr-9 text-left shadow-xs outline-none transition-[translate,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary-soft hover:shadow-card focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 motion-safe:animate-rise"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-card">
                          <Icon className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium leading-snug">{s.text}</span>
                          <span className="text-xs text-muted-foreground">{MODES[s.mode].label}</span>
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          className="absolute top-3.5 right-3 size-4 text-primary opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {topBar}

      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-8 px-4 pt-8 pb-10">
              {messages.map((m, i) => {
                const last = i === messages.length - 1;
                return (
                  <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={m.role === "user"}>
                    <MessageView
                      message={m}
                      animate={i >= initialCount}
                      latest={last}
                      streaming={m.role === "assistant" && last && status === "streaming"}
                      showActions={m.role === "assistant" && !(busy && last)}
                      feedback={feedback[m.id]}
                    />
                  </MessageScrollerItem>
                );
              })}
              {status === "submitted" && (
                <MessageScrollerItem>
                  <PendingReply />
                </MessageScrollerItem>
              )}
              {error && (
                <MessageScrollerItem>
                  <Alert variant="destructive" className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
                    <CircleAlert />
                    <AlertTitle>Chưa nhận được câu trả lời</AlertTitle>
                    <AlertDescription>{error.message || "Có lỗi xảy ra."}</AlertDescription>
                    <AlertAction>
                      <Button variant="outline" size="sm" onClick={() => regenerate({ body })}>
                        <RotateCcw data-icon="inline-start" />
                        Thử lại
                      </Button>
                    </AlertAction>
                  </Alert>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="shadow-card" />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">{composer}</div>
    </div>
  );
}

function Composer({
  input,
  onInput,
  onSend,
  onStop,
  busy,
  subject,
  onSubject,
  modes,
  mode,
  onMode,
  chapterList,
  chapters,
  onChapters,
  large,
}: {
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  subject: string;
  onSubject: (s: string) => void;
  modes: ModeId[];
  mode: ModeId;
  onMode: (m: ModeId) => void;
  chapterList: Chapter[];
  chapters: number[];
  onChapters: (c: number[]) => void;
  large: boolean;
}) {
  const nearLimit = input.length > MAX_QUESTION * 0.8;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="flex flex-col gap-2"
    >
      <InputGroup
        className={cn(
          "overflow-hidden rounded-3xl bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(5_46_22/0.18)] transition-[border-color,box-shadow] duration-200",
          "has-[textarea:focus-visible]:border-primary/50 has-[textarea:focus-visible]:ring-0",
          "has-[textarea:focus-visible]:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_10%,transparent),0_12px_32px_-14px_rgb(5_46_22/0.28)]",
        )}
      >
        {/* Vệt sáng chạy dọc mép trên trong lúc trợ lý đang trả lời. */}
        {busy && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
            <span className="block h-full w-2/5 bg-linear-to-r from-transparent via-primary to-transparent motion-safe:animate-scan motion-reduce:w-full motion-reduce:opacity-40" />
          </span>
        )}
        <InputGroupTextarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={large ? 3 : 1}
          maxLength={MAX_QUESTION}
          placeholder={MODES[mode].placeholder}
          aria-label="Câu hỏi"
          className={cn("max-h-52 px-5 pt-4 text-[15px]", large ? "min-h-20" : "min-h-12")}
        />
        <InputGroupAddon align="block-end" className="no-scrollbar gap-1 overflow-x-auto px-2.5 pb-2.5">
          <SubjectMenu value={subject} onChange={onSubject} />
          <ModeMenu modes={modes} value={mode} onChange={onMode} />
          <ChapterMenu chapters={chapterList} value={chapters} onChange={onChapters} />
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {nearLimit && (
              <span
                aria-live="polite"
                className={cn(
                  "text-xs tabular-nums motion-safe:animate-in motion-safe:fade-in",
                  input.length >= MAX_QUESTION ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {input.length}/{MAX_QUESTION}
              </span>
            )}
            {busy ? (
              <InputGroupButton
                key="stop"
                variant="outline"
                size="icon-sm"
                onClick={onStop}
                aria-label="Dừng"
                className="rounded-full transition-transform active:scale-90 motion-safe:animate-in motion-safe:zoom-in-75"
              >
                <Square className="size-3 fill-current" />
              </InputGroupButton>
            ) : (
              // Không dùng `disabled`: InputGroup làm mờ cả khối khi có phần tử bị vô hiệu hóa bên trong.
              <InputGroupButton
                key="send"
                type="submit"
                variant="default"
                size="icon-sm"
                aria-label="Gửi câu hỏi"
                aria-disabled={!input.trim()}
                className="rounded-full shadow-[0_4px_12px_-4px_color-mix(in_oklch,var(--primary)_60%,transparent)] transition-[opacity,transform,box-shadow] duration-200 hover:scale-105 active:scale-90 aria-disabled:opacity-40 aria-disabled:shadow-none aria-disabled:hover:scale-100 motion-safe:animate-in motion-safe:zoom-in-75"
              >
                <ArrowUp />
              </InputGroupButton>
            )}
          </span>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex items-center justify-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground sm:justify-between">
        <span className={cn("items-center gap-1.5", large ? "hidden sm:flex" : "hidden")}>
          <Kbd>Enter</Kbd> để gửi, <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> để xuống dòng
        </span>
        <p className={cn("text-pretty", large ? "text-center sm:text-right" : "w-full text-center")}>
          Trợ lý dùng trí tuệ nhân tạo và có thể sai. Hãy đối chiếu với giáo trình khi ôn thi.
        </p>
      </div>
    </form>
  );
}
