"use client";

import { Check, ChartColumn, Dices, MessageSquareText, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EXERCISES, type Exercise, getTemplate, makeExercise, parseAnswer, quantityLabel, UNITS } from "@/domain/ktct/exercises";
import { PERCENT, type Quantity, SYMBOL } from "@/domain/ktct/formulas";
import { cn } from "@/lib/utils";

import { type ExerciseResult, submitExercise } from "../actions";

const show = (q: Quantity, x: number) => `${x.toLocaleString("vi-VN")}${PERCENT.has(q) ? " %" : UNITS[q] ? ` ${UNITS[q]}` : ""}`;

/** Bài tập tính toán sinh số: nhập đáp án, máy chủ chấm bằng bộ công thức, hiện lời giải từng bước. */
export function ExerciseRunner({ subject, chapter, initial }: { subject: string; chapter: number; initial: Exercise }) {
  const [exercise, setExercise] = useState(initial);
  const [inputs, setInputs] = useState<Partial<Record<Quantity, string>>>({});
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const templates = EXERCISES[subject]?.[chapter] ?? [];
  const template = getTemplate(exercise.template)!;
  const parsed = Object.fromEntries(template.targets.map((q) => [q, parseAnswer(inputs[q] ?? "")])) as Record<Quantity, number | null>;
  const invalid = template.targets.filter((q) => (inputs[q] ?? "").trim() !== "" && parsed[q] === null);
  const filled = template.targets.every((q) => parsed[q] !== null);

  function next(templateId = exercise.template) {
    setExercise(makeExercise(getTemplate(templateId)!));
    setInputs({});
    setResult(null);
    setError(null);
  }

  function check() {
    setError(null);
    startTransition(async () => {
      try {
        setResult(await submitExercise({ subject, chapter, template: template.id, given: exercise.given, answers: parsed }));
      } catch {
        setError("Chưa chấm được bài. Đồng chí thử lại sau ít phút.");
      }
    });
  }

  const allCorrect = result?.results.every((r) => r.correct);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dạng bài</span>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={1}
          className="w-full flex-wrap"
          value={[exercise.template]}
          onValueChange={(v) => v[0] && next(v[0] as string)}
        >
          {templates.map((t) => (
            <ToggleGroupItem key={t.id} value={t.id}>
              {t.title}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>{template.title}</CardDescription>
          <CardTitle className="text-base font-medium leading-relaxed sm:text-lg">{exercise.prompt}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {template.targets.map((q) => {
              const r = result?.results.find((x) => x.quantity === q);
              return (
                <Field key={q} data-invalid={invalid.includes(q) || undefined}>
                  <FieldLabel htmlFor={`bt-${q}`}>
                    {SYMBOL[q]} <span className="font-normal text-muted-foreground">({quantityLabel(q)})</span>
                  </FieldLabel>
                  <InputGroup className={cn(r && (r.correct ? "border-primary" : "border-destructive"))}>
                    <InputGroupInput
                      id={`bt-${q}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={inputs[q] ?? ""}
                      onChange={(e) => setInputs((s) => ({ ...s, [q]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && filled && !result && check()}
                      disabled={!!result || pending}
                      aria-invalid={invalid.includes(q) || undefined}
                    />
                    {UNITS[q] && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{UNITS[q]}</InputGroupText>
                      </InputGroupAddon>
                    )}
                    {r && (
                      <InputGroupAddon align="inline-end">
                        {r.correct ? <Check className="text-primary" aria-label="Đúng" /> : <X className="text-destructive" aria-label="Sai" />}
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  {invalid.includes(q) && <FieldDescription>Chưa đọc được số, ví dụ 37,5.</FieldDescription>}
                  {r && !r.correct && <FieldDescription>Đáp số: {show(q, r.expected)}</FieldDescription>}
                </Field>
              );
            })}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {result ? (
            <>
              <Button onClick={() => next()}>
                <Dices data-icon="inline-start" />
                Bài khác
              </Button>
              <Button
                variant="outline"
                render={<Link href={`/tro-ly?mon=${subject}&che-do=exercise&chuong=${chapter}&q=${encodeURIComponent(exercise.prompt)}`} />}
                nativeButton={false}
              >
                <MessageSquareText data-icon="inline-start" />
                Hỏi trợ lý cách giải
              </Button>
              <Button variant="ghost" render={<Link href="/tien-do" />} nativeButton={false}>
                <ChartColumn data-icon="inline-start" />
                Xem tiến độ
              </Button>
            </>
          ) : (
            <>
              <Button onClick={check} disabled={!filled || pending}>
                {pending ? "Đang chấm…" : "Kiểm tra"}
              </Button>
              <Button variant="ghost" onClick={() => next()} disabled={pending}>
                <Dices data-icon="inline-start" />
                Đổi số
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="bg-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lời giải
              <Badge variant={allCorrect ? "secondary" : "destructive"}>
                {allCorrect ? "Đúng hết" : `Đúng ${result.results.filter((r) => r.correct).length}/${result.results.length}`}
              </Badge>
            </CardTitle>
            <CardDescription>Các bước tính theo công thức trong giáo trình, cùng công cụ trợ lý dùng khi giải bài tập.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 font-mono text-sm">
              {result.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold">{s.formula}</span>
                    <span className="text-muted-foreground">
                      {s.substitution} → {SYMBOL[s.output]} = {show(s.output, s.value)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
