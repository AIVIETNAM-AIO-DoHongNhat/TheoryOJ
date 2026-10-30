"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, CircleAlert, Search, Square, SquarePen } from "lucide-react";
import { useState } from "react";

import { AcademyLogo } from "@/components/brand";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import {
  MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { type Chapter, getSubject } from "@/config/subjects";
import { subjectSuggestions } from "@/features/learning/content";
import { cn } from "@/lib/utils";

import { MODE_ICONS } from "../mode-icons";
import { MODES, type ModeId } from "../modes";
import type { ChatMessage } from "../types";
import { ChapterMenu, ModeMenu, SubjectMenu } from "./ChatControls";
import { HistorySheet } from "./HistorySheet";
import { MessageView } from "./MessageView";

const MAX_QUESTION = 1500;

export interface ChatAppProps {
  initialSubject: string;
  initialMode: ModeId;
  initialChapters: number[];
  initialQuestion: string;
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
  const { id, messages, sendMessage, regenerate, status, stop, error } = useChat<ChatMessage>({
    id: props.conversation?.id,
    messages: props.conversation?.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const body = { subject: subjectId, mode, chapters };
  const empty = messages.length === 0;
  const suggestions = (subjectSuggestions[subjectId] ?? []).filter((s) => subject.modes.includes(s.mode)).slice(0, 4);
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
    <div className="border-b">
      <div className="mx-auto flex h-11 max-w-3xl items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <HistorySheet currentId={empty ? undefined : id} onNewChat={() => props.onNewChat()} />
          {!empty && <span className="truncate text-sm text-muted-foreground">{subject.name}</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => props.onNewChat()} disabled={busy || empty}>
          <SquarePen data-icon="inline-start" />
          Hội thoại mới
        </Button>
      </div>
    </div>
  );

  if (empty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {topBar}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <AcademyLogo className="size-14 drop-shadow-none" />
              <h1 className="text-balance text-3xl font-bold sm:text-4xl">Đồng chí muốn ôn tập nội dung nào?</h1>
              <p className="max-w-xl text-pretty text-muted-foreground">
                {subject.name}. Câu trả lời chỉ dựa trên giáo trình và văn kiện, kèm số trang để đối chiếu.
              </p>
            </div>
            {composer}
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => {
                const Icon = MODE_ICONS[s.mode];
                return (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => send(s.text, s.mode)}
                    className="group flex items-start gap-3 rounded-2xl border bg-white p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium leading-snug">{s.text}</span>
                      <span className="text-xs text-muted-foreground">{MODES[s.mode].label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
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
            <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-8 px-4 py-8">
              {messages.map((m, i) => (
                <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={m.role === "user"}>
                  <MessageView
                    message={m}
                    showActions={m.role === "assistant" && !(busy && i === messages.length - 1)}
                    feedback={feedback[m.id]}
                  />
                </MessageScrollerItem>
              ))}
              {status === "submitted" && (
                <MessageScrollerItem>
                  <Trace className="pl-11">
                    <TraceLine status="running">
                      <TraceIcon><Search /></TraceIcon>
                      <TraceTitle>Đang tra cứu giáo trình và văn kiện</TraceTitle>
                    </TraceLine>
                  </Trace>
                </MessageScrollerItem>
              )}
              {error && (
                <MessageScrollerItem>
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Chưa nhận được câu trả lời</AlertTitle>
                    <AlertDescription>{error.message || "Có lỗi xảy ra."}</AlertDescription>
                    <AlertAction>
                      <Button variant="outline" size="sm" onClick={() => regenerate({ body })}>Thử lại</Button>
                    </AlertAction>
                  </Alert>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
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
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="flex flex-col gap-2"
    >
      <InputGroup className="rounded-3xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(5_46_22/0.18)] has-[textarea:focus-visible]:border-primary/50 has-[textarea:focus-visible]:ring-0">
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
          {busy ? (
            <InputGroupButton variant="outline" size="icon-sm" onClick={onStop} aria-label="Dừng" className="ml-auto rounded-full">
              <Square className="size-3 fill-current" />
            </InputGroupButton>
          ) : (
            // Không dùng `disabled`: InputGroup làm mờ cả khối khi có phần tử bị vô hiệu hóa bên trong.
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              aria-label="Gửi câu hỏi"
              aria-disabled={!input.trim()}
              className="ml-auto rounded-full aria-disabled:opacity-40"
            >
              <ArrowUp />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="text-center text-xs text-muted-foreground">
        Trợ lý dùng trí tuệ nhân tạo và có thể sai. Hãy đối chiếu với giáo trình khi ôn thi.
      </p>
    </form>
  );
}
