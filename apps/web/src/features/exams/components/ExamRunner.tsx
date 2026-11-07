"use client";

import { CloudCheck, CloudOff, Flag, LayoutGrid, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { markStudied } from "@/features/progress/streak-event";
import { cn } from "@/lib/utils";

import { saveExamAnswers, submitExam } from "../attempt-actions";
import type { PaperQuestion } from "../types";

const LETTERS = "ABCDEF";
const SAVE_DELAY_MS = 800;

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Làm một lượt đề thi. Đồng hồ tính theo giờ máy chủ (bù lệch giờ của máy học viên). Mỗi lần chọn đáp án được lưu
 * lên máy chủ sau một nhịp ngắn; hết giờ thì tự nộp, máy chủ cũng tự chấm phần đã lưu nếu trình duyệt đã đóng.
 */
export function ExamRunner({
  attemptId,
  deadline,
  serverNow,
  paper,
  initialAnswers,
}: {
  attemptId: number;
  deadline: string;
  serverNow: string;
  paper: PaperQuestion[];
  initialAnswers: Record<string, number>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Lệch giờ giữa máy chủ và máy học viên, đo một lần khi mở trang.
  const deadlineMs = new Date(deadline).getTime();
  const skew = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(deadlineMs - new Date(serverNow).getTime());
  const submitted = useRef(false);

  // Bản mới nhất của đáp án cho các hàm lưu, nộp chạy trong hẹn giờ.
  const answersRef = useRef(initialAnswers);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mỗi lúc chỉ một yêu cầu lưu: mạng chậm thì yêu cầu cũ về sau cũng không ghi đè đáp án mới hơn trên máy chủ.
  const inFlight = useRef<Promise<void> | null>(null);
  const flush = useCallback(async () => {
    while (inFlight.current) await inFlight.current;
    if (!dirty.current || submitted.current) return;
    dirty.current = false;
    setSaveState("saving");
    const request = (async () => {
      try {
        const res = await saveExamAnswers({ attemptId, answers: answersRef.current });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        dirty.current = true;
        setSaveState("error");
      }
    })();
    inFlight.current = request;
    await request;
    inFlight.current = null;
  }, [attemptId]);

  // Tự nộp khi hết giờ mà lỗi (mất mạng) thì thử lại thưa dần: 5 giây, 10 giây... tối đa 1 phút, không gửi mỗi giây.
  const retryAt = useRef(0);
  const retryDelay = useRef(5_000);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    setConfirmOpen(false);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    const failed = (message: string) => {
      submitted.current = false;
      setError(message);
      retryAt.current = Date.now() + retryDelay.current;
      retryDelay.current = Math.min(retryDelay.current * 2, 60_000);
    };
    startTransition(async () => {
      try {
        const res = await submitExam({ attemptId, answers: answersRef.current });
        if (!res.ok) return failed(res.error);
        markStudied();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        failed("Chưa nộp được bài. Kiểm tra kết nối mạng rồi bấm nộp lại; đáp án đã chọn vẫn được giữ.");
      }
    });
  }, [attemptId]);

  // Đồng hồ: hết giờ thì tự nộp.
  useEffect(() => {
    skew.current ??= new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const left = deadlineMs - (Date.now() + skew.current!);
      setRemaining(left);
      if (left <= 0 && Date.now() >= retryAt.current) submit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, serverNow, submit]);

  // Lưu khi rời tab hoặc đóng trang.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  function choose(key: string, option: number) {
    const next = { ...answersRef.current, [key]: option };
    answersRef.current = next;
    setAnswers(next);
    dirty.current = true;
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  const toggleFlag = (key: string, on: boolean) =>
    setFlagged((s) => {
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const answered = paper.filter((q) => answers[q.key] !== undefined).length;
  const left = paper.length - answered;
  const low = remaining < 60_000;
  const requestSubmit = () => (left > 0 || flagged.size > 0 ? setConfirmOpen(true) : submit());

  const nav = (onJump?: () => void) => (
    <div className="grid grid-cols-5 gap-2">
      {paper.map((q, i) => {
        const done = answers[q.key] !== undefined;
        return (
          <button
            key={q.key}
            type="button"
            onClick={() => {
              document.getElementById(`cau-${i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              onJump?.();
            }}
            aria-label={`Câu ${i + 1}, ${done ? "đã làm" : "chưa làm"}${flagged.has(q.key) ? ", cần xem lại" : ""}`}
            className={cn(
              "relative flex h-10 items-center justify-center rounded-lg border bg-card text-sm font-medium tabular-nums transition-colors outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              done ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground",
            )}
          >
            {i + 1}
            {flagged.has(q.key) && (
              <Flag className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-card fill-warn p-0.5 text-warn ring-1 ring-warn/40" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );

  const saveBadge = (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      {saveState === "saving" ? (
        <>
          <Spinner className="size-3.5" /> Đang lưu…
        </>
      ) : saveState === "error" ? (
        <span className="flex items-center gap-1.5 text-destructive">
          <CloudOff className="size-3.5" /> Chưa lưu được, sẽ thử lại
        </span>
      ) : saveState === "saved" ? (
        <>
          <CloudCheck className="size-3.5 text-primary" /> Đã lưu
        </>
      ) : (
        "Đáp án được lưu tự động"
      )}
    </span>
  );

  // Lưu lỗi thì thử lại sau vài giây.
  useEffect(() => {
    if (saveState !== "error") return;
    const id = setTimeout(() => {
      dirty.current = true;
      void flush();
    }, 4000);
    return () => clearTimeout(id);
  }, [saveState, flush]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
      <div className="sticky top-19 z-10 flex items-center gap-3 rounded-xl border bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur lg:hidden">
        <span className={cn("flex items-center gap-1.5 text-sm font-semibold tabular-nums", low && "text-destructive")}>
          <Timer className="size-4" />
          {clock(remaining)}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          Đã làm <b className="text-foreground">{answered}</b>/{paper.length}
        </span>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" className="ml-auto bg-card" />}>
            <LayoutGrid data-icon="inline-start" />
            Câu
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3">
            {nav()}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {low && remaining > 0 && (
          <Alert variant="destructive">
            <Timer />
            <AlertTitle>Còn chưa đầy một phút</AlertTitle>
            <AlertDescription>Hết giờ bài được tự nộp với các đáp án đã chọn.</AlertDescription>
          </Alert>
        )}
        <ol className="flex flex-col gap-4">
          {paper.map((q, i) => {
            const isFlagged = flagged.has(q.key);
            return (
              <li key={q.key} id={`cau-${i + 1}`} className="scroll-mt-40 lg:scroll-mt-24">
                <Card className={cn(isFlagged && "ring-warn/50")}>
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                      Câu {i + 1}
                      <Toggle
                        variant="outline"
                        size="sm"
                        pressed={isFlagged}
                        onPressedChange={(on) => toggleFlag(q.key, on)}
                        disabled={pending}
                        className="ml-auto bg-card aria-pressed:border-warn/50 aria-pressed:bg-warn-soft aria-pressed:text-warn"
                      >
                        <Flag className={cn(isFlagged && "fill-current")} />
                        {isFlagged ? "Đã đánh dấu" : "Xem lại sau"}
                      </Toggle>
                    </CardDescription>
                    <CardTitle className="text-base leading-snug sm:text-lg">{q.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={answers[q.key] === undefined ? null : String(answers[q.key])}
                      onValueChange={(v) => choose(q.key, Number(v))}
                      disabled={pending}
                    >
                      {q.options.map((o, j) => (
                        <FieldLabel key={o.key} htmlFor={`${q.key}-${o.key}`}>
                          <Field orientation="horizontal">
                            <RadioGroupItem value={String(o.key)} id={`${q.key}-${o.key}`} />
                            <FieldContent>
                              <FieldTitle className="font-normal leading-snug">
                                <span className="mr-1.5 font-semibold text-muted-foreground">{LETTERS[j]}.</span>
                                {o.text}
                              </FieldTitle>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between lg:hidden">
          {saveBadge}
          <Button size="lg" onClick={requestSubmit} disabled={pending}>
            {pending ? "Đang nộp…" : "Nộp bài"}
          </Button>
        </div>
      </div>

      <aside className="sticky top-24 hidden lg:block" aria-label="Bảng làm bài">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Timer className="size-4" />
              Thời gian còn lại
            </CardDescription>
            <CardTitle className={cn("font-heading text-3xl font-bold tabular-nums", low && "text-destructive")} role="timer" aria-live="off">
              {clock(remaining)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Progress value={(answered / paper.length) * 100} />
              <p className="text-sm text-muted-foreground">
                Đã làm <b className="text-foreground">{answered}</b>/{paper.length} câu
                {flagged.size > 0 && <>, xem lại <b className="text-warn">{flagged.size}</b></>}
              </p>
            </div>
            {nav()}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <Button size="lg" onClick={requestSubmit} disabled={pending}>
              {pending ? "Đang nộp…" : "Nộp bài"}
            </Button>
            {saveBadge}
          </CardFooter>
        </Card>
      </aside>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{left > 0 ? `Nộp bài khi còn ${left} câu chưa làm?` : "Nộp bài?"}</DialogTitle>
            <DialogDescription>
              {left > 0 && "Câu bỏ trống tính là sai. "}
              {flagged.size > 0 && `Đồng chí còn ${flagged.size} câu đánh dấu xem lại. `}
              Nộp rồi thì không sửa được nữa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Làm tiếp</DialogClose>
            <Button onClick={submit}>Nộp bài</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
