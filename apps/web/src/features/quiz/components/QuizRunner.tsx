"use client";

import { BookOpen, Check, ChartColumn, MessageSquareText, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

import { newQuiz, submitQuiz } from "../actions";
import { PASS_RATIO, type QuizQuestion, type QuizResult } from "../types";

export interface TextbookRef {
  /** Đường dẫn trình đọc của giáo trình, trang in đổi sang trang PDF bằng pageOffset. */
  href: string;
  pageOffset: number;
}

const LETTERS = "ABCDEF";

/** Làm một đề trắc nghiệm: chọn đáp án, nộp để máy chủ chấm, xem giải thích kèm trang giáo trình. */
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
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const answered = Object.keys(answers).length;
  const remaining = questions.length - answered;
  const byId = new Map(result?.items.map((i) => [i.id, i]));

  function submit() {
    setError(null);
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
        setResult(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("Chưa tải được đề mới. Đồng chí thử lại sau ít phút.");
      }
    });
  }

  const pageHref = (page: number) => (textbook ? `${textbook.href}?trang=${page - textbook.pageOffset}` : null);
  const wrongTexts = result ? questions.filter((q) => !byId.get(q.id)?.correct).map((q) => q.q) : [];

  return (
    <div className="flex flex-col gap-6">
      {result ? (
        <ResultSummary
          result={result}
          onRetry={retry}
          pending={pending}
          askHref={
            wrongTexts.length
              ? `/tro-ly?mon=${subject}&che-do=qa&chuong=${chapter}&q=${encodeURIComponent(`Giải thích giúp tôi: ${wrongTexts[0]}`)}`
              : null
          }
        />
      ) : (
        <div className="sticky top-19 z-10 flex items-center gap-4 rounded-xl border bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <Progress value={(answered / questions.length) * 100} className="flex-1" />
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            Đã chọn {answered}/{questions.length}
          </span>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => {
          const item = byId.get(q.id);
          return (
            <li key={q.id}>
              <Card className={cn(item && (item.correct ? "ring-primary/40" : "ring-destructive/40"))}>
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    Câu {i + 1}
                    {item && (
                      <Badge variant={item.correct ? "secondary" : "destructive"}>
                        {item.correct ? "Đúng" : item.chosen === null ? "Bỏ trống" : "Sai"}
                      </Badge>
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

      {!result && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {remaining > 0 ? `Còn ${remaining} câu chưa chọn. Câu bỏ trống tính là sai.` : "Đã chọn đủ các câu."}
          </p>
          <Button size="lg" onClick={submit} disabled={pending || answered === 0}>
            {pending ? "Đang chấm…" : "Nộp bài"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ResultSummary({
  result, onRetry, pending, askHref,
}: { result: QuizResult; onRetry: () => void; pending: boolean; askHref: string | null }) {
  const ratio = result.score / result.total;
  const passed = ratio >= PASS_RATIO;
  return (
    <Card className={cn("bg-subtle", passed && "ring-primary/40")}>
      <CardHeader>
        <CardDescription>Kết quả</CardDescription>
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
