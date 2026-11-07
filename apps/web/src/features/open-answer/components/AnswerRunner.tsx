"use client";

import { MessageCircleQuestion, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { markStudied } from "@/features/progress/streak-event";
import { cn } from "@/lib/utils";

import { answerFollowUp, askFollowUp, submitEssay, submitRebuttal } from "../actions";
import { type GradeResponse, MAX_ANSWER, MAX_FOLLOW_UP, MIN_ANSWER, MIN_FOLLOW_UP } from "../types";
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

function Counter({ length, min, max }: { length: number; min: number; max: number }) {
  return (
    <span className={cn("text-xs tabular-nums", length < min || length > max ? "text-muted-foreground" : "text-primary")}>
      {length.toLocaleString("vi-VN")}/{max.toLocaleString("vi-VN")} ký tự{length < min ? ` (tối thiểu ${min})` : ""}
    </span>
  );
}

/** Hỏi vặn sau khi chấm: một câu nhắm vào ý còn thiếu nặng nhất, trả lời ngắn rồi chấm riêng ý đó. */
function FollowUp({ attemptId }: { attemptId: number }) {
  const [question, setQuestion] = useState<{ pointId: string; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ask = () =>
    start(async () => {
      setError(null);
      setResult(null);
      setAnswer("");
      const r = await askFollowUp(attemptId);
      if (!r.ok) setError(r.error);
      else if (r.done) setDone(true);
      else setQuestion({ pointId: r.pointId, text: r.question });
    });

  const send = () =>
    start(async () => {
      if (!question) return;
      setError(null);
      const r = await answerFollowUp({ attemptId, pointId: question.pointId, question: question.text, answer });
      if (r.ok) {
        setResult(r.response);
        markStudied();
      } else setError(r.error);
    });

  if (done) {
    return <p className="rounded-xl border bg-primary-soft p-4 text-sm">Bài làm đã đạt mọi ý trong barem, không còn ý nào để hỏi vặn.</p>;
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-dashed bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <MessageCircleQuestion className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">Vấn đáp: hỏi vặn ý còn thiếu</h3>
          <p className="text-xs text-muted-foreground">Như khi thi vấn đáp, giảng viên hỏi thêm đúng chỗ bài làm còn yếu.</p>
        </div>
        {!question && (
          <Button variant="outline" onClick={ask} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Hỏi vặn tôi
          </Button>
        )}
      </div>
      {question && (
        <>
          <p className="rounded-lg bg-subtle p-3 text-sm font-medium leading-relaxed">{question.text}</p>
          {result ? (
            <>
              <GradeReport response={result} compact />
              <Button variant="outline" className="self-start" onClick={ask} disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
                Hỏi câu khác
              </Button>
            </>
          ) : (
            <>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={MAX_FOLLOW_UP}
                rows={4}
                placeholder="Trả lời ngắn gọn, đúng trọng tâm câu hỏi."
                aria-label="Câu trả lời vấn đáp"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Counter length={answer.trim().length} min={MIN_FOLLOW_UP} max={MAX_FOLLOW_UP} />
                <Button onClick={send} disabled={pending || answer.trim().length < MIN_FOLLOW_UP}>
                  {pending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
                  Trả lời
                </Button>
              </div>
            </>
          )}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

/**
 * Khung làm bài câu hỏi mở: soạn bài (lưu nháp trong trình duyệt), nộp để chấm theo barem, xem kết quả,
 * rồi hỏi vặn hoặc làm lại. Barem không gửi xuống trước khi nộp.
 */
export function AnswerRunner({
  target, initial, initialAnswer, placeholder,
}: {
  target: Target;
  /** Lượt gần nhất của câu này, nếu có. */
  initial?: GradeResponse | null;
  initialAnswer?: string;
  placeholder?: string;
}) {
  const draftKey = `cau-mo:${target.kind}:${target.subject}:${target.itemId}`;
  const [answer, setAnswer] = useState(initialAnswer ?? "");
  const [response, setResponse] = useState<GradeResponse | null>(initial ?? null);
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
      setResponse(r.response);
      writeDraft(draftKey, "");
      markStudied();
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  const length = answer.trim().length;

  if (response) {
    return (
      <div ref={top} className="flex scroll-mt-24 flex-col gap-5">
        <details className="rounded-xl border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Bài làm của đồng chí</summary>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{answer}</p>
        </details>
        <GradeReport response={response} />
        {response.result.stance !== "sai" && response.result.flagReason !== "chen_lenh" && <FollowUp attemptId={response.attemptId} />}
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            setResponse(null);
            writeDraft(draftKey, answer);
          }}
        >
          <RotateCcw data-icon="inline-start" />
          Sửa bài và nộp lại
        </Button>
      </div>
    );
  }

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-3">
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
        <Counter length={length} min={MIN_ANSWER} max={MAX_ANSWER} />
        <Button onClick={submit} disabled={pending || length < MIN_ANSWER}>
          {pending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
          {pending ? "Đang chấm…" : "Nộp để chấm"}
        </Button>
      </div>
      {pending && <p className="text-xs text-muted-foreground">Hệ thống đang đối chiếu bài làm với giáo trình, thường mất 10–30 giây.</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
