"use client";

import { BookOpen, Check, ChartColumn, Flag, LayoutGrid, MessageSquareText, RotateCcw, Timer, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

import { newQuiz, submitQuiz } from "../actions";
import { PASS_RATIO, type QuizQuestion, type QuizResult, type QuizResultItem } from "../types";

export interface TextbookRef {
  /** Đường dẫn trình đọc của giáo trình, trang in đổi sang trang PDF bằng pageOffset. */
  href: string;
  pageOffset: number;
}

const LETTERS = "ABCDEF";

/** Trạng thái một câu cho bảng điều hướng: trước khi nộp theo việc chọn, sau khi nộp theo kết quả chấm. */
interface NavItem {
  n: number;
  answered: boolean;
  flagged: boolean;
  result?: QuizResultItem;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function jumpTo(n: number) {
  document.getElementById(`cau-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Làm một đề trắc nghiệm: đề ở cột trái, bảng thời gian, số câu đã làm, chưa làm, cần xem lại ở cột phải.
 * Nộp để máy chủ chấm, xem giải thích kèm trang giáo trình.
 */
export function QuizRunner({
  subject,
  chapter,
  initialQuestions,
  textbook,
}: {
  subject: string;
  chapter: number;
  initialQuestions: QuizQuestion[];
  textbook: TextbookRef | null;
}) {
  // Đề giữ trong state: lần nộp đầu ghi cookie mã khách làm Next làm mới route, đề và kết quả không được thay theo.
  const [questions, setQuestions] = useState(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Đồng hồ tính từ lúc mở đề, dừng khi nộp. Tính theo mốc bắt đầu để không lệch khi tab bị ẩn.
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const running = !result && !pending;
  useEffect(() => {
    if (!running) return;
    startRef.current ??= Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const answered = Object.keys(answers).length;
  const remaining = questions.length - answered;
  const byId = new Map(result?.items.map((i) => [i.id, i]));
  const nav: NavItem[] = questions.map((q, i) => ({
    n: i + 1,
    answered: answers[q.id] !== undefined,
    flagged: flagged.has(q.id),
    result: byId.get(q.id),
  }));

  function toggleFlag(id: string, on: boolean) {
    setFlagged((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function submit() {
    setError(null);
    if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    startTransition(async () => {
      try {
        const payload = Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? null]));
        setResult(await submitQuiz({ subject, chapter, answers: payload }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("Chưa nộp được bài. Đồng chí thử lại sau ít phút.");
      }
    });
  }

  function retry() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await newQuiz(subject, chapter);
        setQuestions(next);
        setAnswers({});
        setFlagged(new Set());
        setResult(null);
        startRef.current = null;
        setElapsed(0);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("Chưa tải được đề mới. Đồng chí thử lại sau ít phút.");
      }
    });
  }

  const pageHref = (page: number) => (textbook ? `${textbook.href}?trang=${page - textbook.pageOffset}` : null);
  const wrongTexts = result ? questions.filter((q) => !byId.get(q.id)?.correct).map((q) => q.q) : [];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
      {/* Thanh gọn trên điện thoại; màn rộng dùng bảng bên phải. */}
      <MobileBar
        nav={nav}
        elapsed={elapsed}
        answered={answered}
        flaggedCount={flagged.size}
        result={result}
      />

      <div className="flex min-w-0 flex-col gap-6">
        {result && (
          <ResultSummary
            result={result}
            elapsed={elapsed}
            onRetry={retry}
            pending={pending}
            askHref={
              wrongTexts.length
                ? `/tro-ly?mon=${subject}&che-do=qa&chuong=${chapter}&q=${encodeURIComponent(`Giải thích giúp tôi: ${wrongTexts[0]}`)}`
                : null
            }
          />
        )}

        <ol className="flex flex-col gap-4">
          {questions.map((q, i) => {
            const item = byId.get(q.id);
            const isFlagged = flagged.has(q.id);
            return (
              <li key={q.id} id={`cau-${i + 1}`} className="scroll-mt-40 lg:scroll-mt-24">
                <Card
                  className={cn(
                    item ? (item.correct ? "ring-primary/40" : "ring-destructive/40") : isFlagged && "ring-warn/50",
                  )}
                >
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                      Câu {i + 1}
                      {item && (
                        <Badge variant={item.correct ? "secondary" : "destructive"}>
                          {item.correct ? "Đúng" : item.chosen === null ? "Bỏ trống" : "Sai"}
                        </Badge>
                      )}
                      {!result && (
                        <Toggle
                          variant="outline"
                          size="sm"
                          pressed={isFlagged}
                          onPressedChange={(on) => toggleFlag(q.id, on)}
                          disabled={pending}
                          className="ml-auto bg-white aria-pressed:border-warn/50 aria-pressed:bg-warn-soft aria-pressed:text-warn"
                        >
                          <Flag className={cn(isFlagged && "fill-current")} />
                          {isFlagged ? "Đã đánh dấu" : "Xem lại sau"}
                        </Toggle>
                      )}
                    </CardDescription>
                    <CardTitle className="text-base leading-snug sm:text-lg">{q.q}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <RadioGroup
                      value={answers[q.id] === undefined ? null : String(answers[q.id])}
                      onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
                      disabled={!!result || pending}
                    >
                      {q.options.map((o, j) => {
                        const id = `${q.id}-${o.key}`;
                        const isAnswer = item?.answer === o.key;
                        const isWrongChoice = item && !item.correct && item.chosen === o.key;
                        return (
                          <FieldLabel
                            key={o.key}
                            htmlFor={id}
                            className={cn(
                              isAnswer && "border-primary bg-primary-soft",
                              isWrongChoice && "border-destructive/60 bg-destructive/5",
                            )}
                          >
                            <Field orientation="horizontal">
                              <RadioGroupItem value={String(o.key)} id={id} />
                              <FieldContent>
                                <FieldTitle className="font-normal leading-snug">
                                  <span className="mr-1.5 font-semibold text-muted-foreground">{LETTERS[j]}.</span>
                                  {o.text}
                                </FieldTitle>
                              </FieldContent>
                              {isAnswer && <Check className="size-4 shrink-0 text-primary" aria-label="Đáp án đúng" />}
                              {isWrongChoice && <X className="size-4 shrink-0 text-destructive" aria-label="Đáp án đã chọn" />}
                            </Field>
                          </FieldLabel>
                        );
                      })}
                    </RadioGroup>
                    {item && (
                      <div className="flex flex-col gap-2 rounded-lg bg-subtle p-4 text-sm leading-relaxed">
                        <p>{item.explain}</p>
                        {item.page && pageHref(item.page) && (
                          <Link href={pageHref(item.page)!} className="inline-flex items-center gap-1.5 self-start font-medium text-primary hover:underline">
                            <BookOpen className="size-4" />
                            Giáo trình, tr. {item.page}
                          </Link>
                        )}
                      </div>
                    )}
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

        {/* Nút nộp cuối đề cho điện thoại; màn rộng nộp ở bảng bên phải. */}
        {!result && (
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between lg:hidden">
            <SubmitHint remaining={remaining} flaggedCount={flagged.size} />
            <Button size="lg" onClick={submit} disabled={pending || answered === 0}>
              {pending ? "Đang chấm…" : "Nộp bài"}
            </Button>
          </div>
        )}
      </div>

      <aside className="sticky top-24 hidden lg:block" aria-label="Bảng làm bài">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Timer className="size-4" />
              {result ? "Thời gian làm bài" : "Thời gian"}
            </CardDescription>
            <CardTitle className="font-heading text-3xl font-bold tabular-nums" role="timer" aria-live="off">
              {formatTime(elapsed)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Stats nav={nav} />
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Danh sách câu</p>
              <QuestionNav nav={nav} />
              <Legend done={!!result} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            {result ? (
              <Button onClick={retry} disabled={pending}>
                <RotateCcw data-icon="inline-start" />
                Làm đề khác
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={submit} disabled={pending || answered === 0}>
                  {pending ? "Đang chấm…" : "Nộp bài"}
                </Button>
                <SubmitHint remaining={remaining} flaggedCount={flagged.size} />
              </>
            )}
          </CardFooter>
        </Card>
      </aside>
    </div>
  );
}

function SubmitHint({ remaining, flaggedCount }: { remaining: number; flaggedCount: number }) {
  const parts = [
    remaining > 0 && `Còn ${remaining} câu chưa làm, câu bỏ trống tính là sai.`,
    flaggedCount > 0 && `${flaggedCount} câu đánh dấu xem lại.`,
  ].filter(Boolean);
  return (
    <p className="text-center text-sm text-muted-foreground lg:text-left">
      {parts.length ? parts.join(" ") : "Đã làm đủ các câu."}
    </p>
  );
}

/** Ba ô số: trước khi nộp là đã làm, chưa làm, xem lại; sau khi nộp là đúng, sai, bỏ trống. */
function Stats({ nav }: { nav: NavItem[] }) {
  const done = nav.some((x) => x.result);
  const count = (f: (x: NavItem) => boolean) => nav.filter(f).length;
  const tiles = done
    ? [
        { label: "Đúng", value: count((x) => !!x.result?.correct), className: "text-primary" },
        { label: "Sai", value: count((x) => !!x.result && !x.result.correct && x.result.chosen !== null), className: "text-destructive" },
        { label: "Bỏ trống", value: count((x) => x.result?.chosen === null), className: "text-muted-foreground" },
      ]
    : [
        { label: "Đã làm", value: count((x) => x.answered), className: "text-primary" },
        { label: "Chưa làm", value: count((x) => !x.answered), className: "text-foreground" },
        { label: "Xem lại", value: count((x) => x.flagged), className: "text-warn" },
      ];
  return (
    <div className="flex flex-col gap-3">
      {!done && <Progress value={(count((x) => x.answered) / nav.length) * 100} />}
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col items-center gap-0.5 rounded-lg bg-subtle px-1 py-2.5">
            <dd className={cn("font-heading text-2xl font-bold tabular-nums", t.className)}>{t.value}</dd>
            <dt className="text-xs text-muted-foreground">{t.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function QuestionNav({ nav, onJump }: { nav: NavItem[]; onJump?: () => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {nav.map((x) => {
        const r = x.result;
        const state = r
          ? r.correct ? "đúng" : r.chosen === null ? "bỏ trống" : "sai"
          : x.answered ? "đã làm" : "chưa làm";
        return (
          <button
            key={x.n}
            type="button"
            onClick={() => {
              jumpTo(x.n);
              onJump?.();
            }}
            aria-label={`Câu ${x.n}, ${state}${x.flagged && !r ? ", cần xem lại" : ""}`}
            className={cn(
              "relative flex h-10 items-center justify-center rounded-lg border bg-white text-sm font-medium tabular-nums transition-colors outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              r
                ? r.correct
                  ? "border-primary/50 bg-primary-soft text-primary"
                  : "border-destructive/50 bg-destructive/5 text-destructive"
                : x.answered
                  ? "border-primary bg-primary text-primary-foreground hover:border-primary hover:bg-primary/90"
                  : "text-muted-foreground",
              x.flagged && !r && !x.answered && "border-warn/60",
            )}
          >
            {x.n}
            {x.flagged && !r && (
              <Flag className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-white fill-warn p-0.5 text-warn ring-1 ring-warn/40" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Legend({ done }: { done: boolean }) {
  const items = done
    ? [
        { label: "Đúng", swatch: "border-primary/50 bg-primary-soft" },
        { label: "Sai, bỏ trống", swatch: "border-destructive/50 bg-destructive/5" },
      ]
    : [
        { label: "Đã làm", swatch: "border-primary bg-primary" },
        { label: "Chưa làm", swatch: "bg-white" },
      ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded border", i.swatch)} aria-hidden />
          {i.label}
        </li>
      ))}
      {!done && (
        <li className="flex items-center gap-1.5">
          <Flag className="size-3 fill-warn text-warn" aria-hidden />
          Xem lại
        </li>
      )}
    </ul>
  );
}

function MobileBar({
  nav, elapsed, answered, flaggedCount, result,
}: { nav: NavItem[]; elapsed: number; answered: number; flaggedCount: number; result: QuizResult | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-19 z-10 flex items-center gap-3 rounded-xl border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur lg:hidden">
      <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
        <Timer className="size-4 text-muted-foreground" />
        {formatTime(elapsed)}
      </span>
      <Separator orientation="vertical" className="h-5" />
      <span className="truncate text-sm tabular-nums text-muted-foreground">
        {result ? (
          <>Đúng <b className="text-primary">{result.score}</b>/{result.total}</>
        ) : (
          <>
            Đã làm <b className="text-foreground">{answered}</b>/{nav.length}
            {flaggedCount > 0 && <>, xem lại <b className="text-warn">{flaggedCount}</b></>}
          </>
        )}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="ml-auto bg-white" />}>
          <LayoutGrid data-icon="inline-start" />
          Câu
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 gap-3 p-3">
          <PopoverHeader>
            <PopoverTitle>Danh sách câu</PopoverTitle>
          </PopoverHeader>
          <QuestionNav nav={nav} onJump={() => setOpen(false)} />
          <Legend done={!!result} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ResultSummary({
  result, elapsed, onRetry, pending, askHref,
}: { result: QuizResult; elapsed: number; onRetry: () => void; pending: boolean; askHref: string | null }) {
  const ratio = result.score / result.total;
  const passed = ratio >= PASS_RATIO;
  return (
    <Card className={cn("bg-subtle", passed && "ring-primary/40")}>
      <CardHeader>
        <CardDescription>Kết quả, làm trong {formatTime(elapsed)}</CardDescription>
        <CardTitle className="font-heading text-4xl font-bold tabular-nums text-primary">
          {result.score}/{result.total}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {passed
            ? "Đồng chí đã nắm được nội dung chính của chương. Có thể làm đề khác hoặc chuyển chương tiếp theo."
            : "Chưa đạt 7/10. Đồng chí đọc lại phần giải thích và trang giáo trình được dẫn dưới mỗi câu sai rồi làm lại."}
        </p>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <Button onClick={onRetry} disabled={pending}>
          <RotateCcw data-icon="inline-start" />
          Làm đề khác
        </Button>
        {askHref && (
          <Button variant="outline" className="bg-white" render={<Link href={askHref} />} nativeButton={false}>
            <MessageSquareText data-icon="inline-start" />
            Hỏi trợ lý câu sai
          </Button>
        )}
        <Button variant="ghost" render={<Link href="/tien-do" />} nativeButton={false}>
          <ChartColumn data-icon="inline-start" />
          Xem tiến độ
        </Button>
      </CardFooter>
    </Card>
  );
}
