"use client";

import { Clock, PencilLine, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { markStudied } from "@/features/progress/streak-event";
import { cn } from "@/lib/utils";

import { submitEssay, submitRebuttal } from "../actions";
import { MAX_ANSWER, MIN_ANSWER, type Submission } from "../types";
import { GradeReport } from "./GradeReport";

type Target =
  | { kind: "tu_luan"; subject: string; chapter: number; itemId: string }
  | { kind: "phan_bac"; subject: string; itemId: string };

function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Trình duyệt chặn bộ nhớ: bỏ qua, bài vẫn nằm trên trang.
  }
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function YourAnswer({ answer, open }: { answer: string; open?: boolean }) {
  return (
    <details open={open} className="rounded-xl border bg-card p-4 text-sm">
      <summary className="cursor-pointer font-semibold">Bài làm của đồng chí</summary>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{answer}</p>
    </details>
  );
}

/**
 * Khung làm bài tự luận, phản bác: soạn bài (nháp lưu trong trình duyệt), gửi giảng viên phụ trách môn chấm.
 * Trong lúc chờ, học viên sửa được bài đã gửi; khi giảng viên chấm xong thì hiện điểm và nhận xét từng ý.
 * Barem chỉ hiện sau khi được chấm.
 */
export function AnswerRunner({ target, initial, placeholder }: {
  target: Target;
  /** Bài gần nhất của câu này, nếu có. */
  initial?: Submission | null;
  placeholder?: string;
}) {
  const draftKey = `cau-mo:${target.kind}:${target.subject}:${target.itemId}`;
  const [submission, setSubmission] = useState<Submission | null>(initial ?? null);
  const [editing, setEditing] = useState(!initial);
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  // Nháp trong trình duyệt chỉ đọc sau khi gắn vào trang, để bản dựng trên máy chủ và trình duyệt khớp nhau.
  useEffect(() => {
    if (initial) return;
    const draft = readDraft(draftKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc bộ nhớ trình duyệt một lần sau khi gắn
    if (draft) setAnswer(draft);
  }, [draftKey, initial]);

  const change = (value: string) => {
    setAnswer(value);
    writeDraft(draftKey, value);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const r = target.kind === "tu_luan"
        ? await submitEssay({ subject: target.subject, chapter: target.chapter, questionId: target.itemId, answer })
        : await submitRebuttal({ subject: target.subject, itemId: target.itemId, answer });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSubmission(r.submission);
      setEditing(false);
      writeDraft(draftKey, "");
      markStudied();
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  // Đang sửa bài chờ chấm thì gửi lại vào chính bài đó; đã chấm thì gửi là một bài mới.
  const updating = submission?.status === "cho_cham";
  const length = answer.trim().length;

  if (!editing && submission?.status === "cho_cham") {
    return (
      <div ref={top} className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-primary-soft/60 p-5 ring-1 ring-primary/10 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary ring-1 ring-primary/10">
            <Clock className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="font-semibold">Đã gửi giảng viên phụ trách chấm</p>
            <p className="text-sm text-muted-foreground">
              Gửi lúc {when(submission.submittedAt)}. Giảng viên sẽ chấm từng ý theo barem và nhận xét; kết quả hiện tại đây.
              Trong lúc chờ, đồng chí vẫn sửa được bài.
            </p>
          </div>
          <Button variant="outline" className="bg-card" onClick={() => setEditing(true)}>
            <PencilLine data-icon="inline-start" />
            Sửa bài đã gửi
          </Button>
        </div>
        <YourAnswer answer={submission.answer} open />
      </div>
    );
  }

  if (!editing && submission?.status === "da_cham" && submission.rubric && submission.result) {
    return (
      <div ref={top} className="flex scroll-mt-24 flex-col gap-5">
        <GradeReport
          rubric={submission.rubric}
          result={submission.result}
          graderName={submission.graderName}
          gradedAt={submission.gradedAt}
          published={submission.published}
        />
        <YourAnswer answer={submission.answer} />
        <Button variant="outline" className="self-start" onClick={() => setEditing(true)}>
          <RotateCcw data-icon="inline-start" />
          Viết lại và gửi bài mới
        </Button>
      </div>
    );
  }

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-3">
      {updating && (
        <p className="text-sm text-muted-foreground">Đồng chí đang sửa bài đã gửi; bài sửa thay cho bài cũ trong hàng chờ của giảng viên.</p>
      )}
      <Textarea
        value={answer}
        onChange={(e) => change(e.target.value)}
        maxLength={MAX_ANSWER}
        rows={14}
        placeholder={placeholder ?? "Trình bày bài làm như khi thi tự luận: nêu từng ý, giải thích, có ví dụ hoặc liên hệ."}
        aria-label="Bài làm"
        className="min-h-72 bg-card text-[15px] leading-relaxed"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={cn("text-xs tabular-nums", length < MIN_ANSWER ? "text-muted-foreground" : "text-primary")}>
          {length.toLocaleString("vi-VN")}/{MAX_ANSWER.toLocaleString("vi-VN")} ký tự{length < MIN_ANSWER ? ` (tối thiểu ${MIN_ANSWER})` : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          {submission && (
            <Button variant="ghost" onClick={() => { setEditing(false); setError(null); }} disabled={pending}>
              <X data-icon="inline-start" />
              Hủy
            </Button>
          )}
          <Button onClick={submit} disabled={pending || length < MIN_ANSWER}>
            {pending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            {updating ? "Cập nhật bài đã gửi" : "Gửi giảng viên chấm"}
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
