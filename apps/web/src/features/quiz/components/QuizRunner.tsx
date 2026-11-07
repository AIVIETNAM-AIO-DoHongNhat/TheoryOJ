"use client";

import {
  BookOpen, Check, ChartColumn, Flag, GalleryVerticalEnd, History, LayoutGrid, MessageSquareText, Repeat, RotateCcw, Timer, X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { markStudied } from "@/features/progress/streak-event";
import { errorMessage, unwrap } from "@/lib/action-result";
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

/** Bài đang làm dở lưu trong trình duyệt, để lỡ tải lại trang hay đóng tab vẫn làm tiếp được. */
interface Draft {
  /** Mã đề máy chủ cấp; bản lưu cũ không có mã thì bỏ, vì máy chủ không chấm đề không rõ nguồn. */
  drawId: string;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  flagged: string[];
  elapsed: number;
}

const noSubscribe = () => () => {};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Draft;
    return typeof d.drawId === "string" && Array.isArray(d.questions) && d.questions.length && d.answers && Object.keys(d.answers).length ? d : null;
  } catch {
    return null;
  }
}

/**
 * Làm một đề trắc nghiệm: đề ở cột trái, bảng thời gian, số câu đã làm, chưa làm, cần xem lại ở cột phải.
 * Nộp để máy chủ chấm, xem giải thích kèm trang giáo trình.
 */
export function QuizRunner({
  subject,
  chapter,
  initialDrawId,
  initialQuestions,
  textbook,
  flashcardsHref,
}: {
  subject: string;
  chapter: number;
  /** Mã đề máy chủ cấp cùng các câu; nộp bài gửi kèm mã này. */
  initialDrawId: string;
  initialQuestions: QuizQuestion[];
  textbook: TextbookRef | null;
  /** Trang thẻ ghi nhớ của chương, nếu chương có bộ thẻ. */
  flashcardsHref: string | null;
}) {
  // Đề giữ trong state để "Làm đề khác", "Ôn lại câu sai" và bài làm dở không phụ thuộc lần dựng trang.
  const [drawId, setDrawId] = useState(initialDrawId);
  const [questions, setQuestions] = useState(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<QuizResult | null>(null);
  /** Đang ôn lại các câu sai của lượt trước: chấm nhưng không tính vào tiến độ. */
  const [reviewing, setReviewing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Bài làm dở của lần trước: chỉ đọc sau khi hiện trên trình duyệt (máy chủ trả null), hỏi trước khi khôi phục.
  const draftKey = `theoryoj:trac-nghiem:${subject}:${chapter}`;
  const savedDraft = parseDraft(useSyncExternalStore(noSubscribe, () => readStorage(draftKey), () => null));
  const [draftHandled, setDraftHandled] = useState(false);

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
  // Bắt đầu chọn đáp án cho đề mới thì coi như bỏ bài làm dở cũ.
  const draft = !draftHandled && answered === 0 && !result ? savedDraft : null;

  // Lưu bài đang làm sau mỗi lần chọn; nộp xong thì xóa. Lượt ôn lại câu sai ngắn nên không lưu.
  useEffect(() => {
    try {
      if (result) localStorage.removeItem(draftKey);
      else if (!reviewing && Object.keys(answers).length) {
        const spent = startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0;
        localStorage.setItem(draftKey, JSON.stringify({ drawId, questions, answers, flagged: [...flagged], elapsed: spent } satisfies Draft));
      }
    } catch {
      // Trình duyệt chặn bộ nhớ (chế độ riêng tư): vẫn làm bài bình thường, chỉ không khôi phục được.
    }
  }, [draftKey, drawId, questions, answers, flagged, result, reviewing]);

  function resumeDraft(d: Draft) {
    setDrawId(d.drawId);
    setQuestions(d.questions);
    setAnswers(d.answers);
    setFlagged(new Set(d.flagged));
    startRef.current = Date.now() - d.elapsed * 1000;
    setElapsed(d.elapsed);
    setDraftHandled(true);
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Không xóa được thì lần sau vẫn hỏi lại, không ảnh hưởng đề đang làm.
    }
    setDraftHandled(true);
  }
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

  /** Còn câu trống thì hỏi lại trước khi nộp, vì câu bỏ trống tính là sai. */
  function requestSubmit() {
    if (remaining > 0) setConfirmOpen(true);
    else submit();
  }

  function submit() {
    setConfirmOpen(false);
    setError(null);
    if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    startTransition(async () => {
      try {
        const payload = Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? null]));
        setResult(unwrap(await submitQuiz({ drawId, answers: payload, review: reviewing })));
        if (!reviewing) markStudied();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        setError(errorMessage(e, "Chưa nộp được bài. Đồng chí thử lại sau ít phút."));
      }
    });
  }

  function retry() {
    setError(null);
    startTransition(async () => {
      try {
        const next = unwrap(await newQuiz(subject, chapter));
        setDrawId(next.drawId);
        setQuestions(next.questions);
        setAnswers({});
        setFlagged(new Set());
        setResult(null);
        setReviewing(false);
        startRef.current = null;
        setElapsed(0);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        setError(errorMessage(e, "Chưa tải được đề mới. Đồng chí thử lại sau ít phút."));
      }
    });
  }

  /** Làm lại riêng các câu sai và bỏ trống của lượt vừa nộp. */
  function reviewWrong() {
    if (!result) return;
    const wrong = new Set(result.items.filter((i) => !i.correct).map((i) => i.id));
    setQuestions((qs) => qs.filter((q) => wrong.has(q.id)));
    setAnswers({});
    setFlagged(new Set());
    setResult(null);
    setReviewing(true);
    setError(null);
    startRef.current = null;
    setElapsed(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const pageHref = (page: number) => (textbook ? `${textbook.href}?trang=${page - textbook.pageOffset}` : null);
  const askHref = (question: string) =>
    `/tro-ly?mon=${subject}&che-do=qa&chuong=${chapter}&q=${encodeURIComponent(`Giải thích giúp tôi: ${question}`)}`;
  const wrongCount = result ? result.items.filter((i) => !i.correct).length : 0;

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
        {draft && (
          <Alert>
            <History />
            <AlertTitle>Đồng chí có đề đang làm dở</AlertTitle>
            <AlertDescription>
              Đã làm {Object.keys(draft.answers).length}/{draft.questions.length} câu, trong {formatTime(draft.elapsed)}. Làm tiếp đề đó hay bắt đầu đề này?
            </AlertDescription>
            <div className="col-start-2 mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => resumeDraft(draft)}>Làm tiếp đề cũ</Button>
              <Button size="sm" variant="outline" className="bg-card" onClick={discardDraft}>Bỏ, làm đề này</Button>
            </div>
          </Alert>
        )}

        {reviewing && !result && (
          <Alert className="bg-warn-soft">
            <Repeat />
            <AlertTitle>Ôn lại {questions.length} câu sai</AlertTitle>
            <AlertDescription>Lượt ôn lại giúp củng cố, không tính vào điểm và tiến độ của chương.</AlertDescription>
          </Alert>
        )}

        {result && (
          <ResultSummary
            result={result}
            elapsed={elapsed}
            reviewing={reviewing}
            wrongCount={wrongCount}
            onRetry={retry}
            onReviewWrong={reviewWrong}
            flashcardsHref={flashcardsHref}
            pending={pending}
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
                          className="ml-auto bg-card aria-pressed:border-warn/50 aria-pressed:bg-warn-soft aria-pressed:text-warn"
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
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {item.page && pageHref(item.page) && (
                            <Link href={pageHref(item.page)!} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                              <BookOpen className="size-4" />
                              Giáo trình, tr. {item.page}
                            </Link>
                          )}
                          {!item.correct && (
                            <Link href={askHref(q.q)} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                              <MessageSquareText className="size-4" />
                              Hỏi trợ lý về câu này
                            </Link>
                          )}
                        </div>
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
            <Button size="lg" onClick={requestSubmit} disabled={pending || answered === 0}>
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
                <Button size="lg" onClick={requestSubmit} disabled={pending || answered === 0}>
                  {pending ? "Đang chấm…" : "Nộp bài"}
                </Button>
                <SubmitHint remaining={remaining} flaggedCount={flagged.size} />
              </>
            )}
          </CardFooter>
        </Card>
      </aside>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nộp bài khi còn {remaining} câu chưa làm?</DialogTitle>
            <DialogDescription>
              Câu bỏ trống tính là sai.{flagged.size > 0 && ` Đồng chí còn ${flagged.size} câu đánh dấu xem lại.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Làm tiếp</DialogClose>
            <Button onClick={submit}>Vẫn nộp bài</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              "relative flex h-10 items-center justify-center rounded-lg border bg-card text-sm font-medium tabular-nums transition-colors outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
              <Flag className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-card fill-warn p-0.5 text-warn ring-1 ring-warn/40" aria-hidden />
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
        { label: "Chưa làm", swatch: "bg-card" },
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
    <div className="sticky top-19 z-10 flex items-center gap-3 rounded-xl border bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur lg:hidden">
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
        <PopoverTrigger render={<Button variant="outline" size="sm" className="ml-auto bg-card" />}>
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
  result, elapsed, reviewing, wrongCount, onRetry, onReviewWrong, flashcardsHref, pending,
}: {
  result: QuizResult;
  elapsed: number;
  reviewing: boolean;
  wrongCount: number;
  onRetry: () => void;
  onReviewWrong: () => void;
  flashcardsHref: string | null;
  pending: boolean;
}) {
  const ratio = result.score / result.total;
  const passed = ratio >= PASS_RATIO;
  const message = reviewing
    ? wrongCount
      ? `Còn ${wrongCount} câu chưa đúng. Đọc kỹ giải thích dưới mỗi câu rồi ôn lại lần nữa.`
      : "Đồng chí đã làm đúng hết các câu sai lần trước. Làm một đề mới để kiểm tra lại cả chương."
    : passed
      ? "Đồng chí đã nắm được nội dung chính của chương. Có thể làm đề khác hoặc chuyển chương tiếp theo."
      : "Chưa đạt 7/10. Đồng chí đọc lại phần giải thích và trang giáo trình được dẫn dưới mỗi câu sai rồi ôn lại các câu đó.";
  return (
    <Card className={cn("bg-subtle", (passed || (reviewing && !wrongCount)) && "ring-primary/40")}>
      <CardHeader>
        <CardDescription>{reviewing ? "Kết quả ôn lại câu sai, không tính vào tiến độ" : `Kết quả, làm trong ${formatTime(elapsed)}`}</CardDescription>
        <CardTitle className="font-heading text-4xl font-bold tabular-nums text-primary">
          {result.score}/{result.total}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        {wrongCount > 0 && (
          <Button onClick={onReviewWrong} disabled={pending}>
            <Repeat data-icon="inline-start" />
            Ôn lại {wrongCount} câu sai
          </Button>
        )}
        <Button variant={wrongCount > 0 ? "outline" : "default"} className={cn(wrongCount > 0 && "bg-card")} onClick={onRetry} disabled={pending}>
          <RotateCcw data-icon="inline-start" />
          Làm đề khác
        </Button>
        {flashcardsHref && (
          <Button variant="outline" className="bg-card" render={<Link href={flashcardsHref} />} nativeButton={false}>
            <GalleryVerticalEnd data-icon="inline-start" />
            Thẻ ghi nhớ chương
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
