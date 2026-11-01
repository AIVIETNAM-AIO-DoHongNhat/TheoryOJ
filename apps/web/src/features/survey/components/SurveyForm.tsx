"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { submitSurvey } from "../actions";
import { questionsFor, ROLE_LABELS, SCALE, type SurveyPhase, type SurveyRole } from "../questions";

interface Initial {
  role: SurveyRole;
  answers: Record<string, number>;
  comment: string | null;
}

/** Phiếu thang 5 điểm. Câu hỏi đổi theo vai trò; gửi lại thì ghi đè phiếu cũ của đợt này. */
export function SurveyForm({ phase, initial }: { phase: SurveyPhase; initial: Initial | null }) {
  const [role, setRole] = useState<SurveyRole>(initial?.role ?? "hoc-vien");
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const questions = questionsFor(role, phase);
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const complete = answered === questions.length;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await submitSurvey({ role, answers, comment });
        setSent(true);
      } catch {
        setError("Chưa gửi được phiếu. Đồng chí thử lại sau ít phút.");
      }
    });
  }

  if (sent) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Đã ghi nhận phiếu khảo sát</AlertTitle>
        <AlertDescription>
          Cảm ơn đồng chí đã dành thời gian. Nếu muốn sửa câu trả lời, mở lại trang này trên cùng trình duyệt và gửi lại.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {initial && (
        <Alert>
          <AlertTitle>Đồng chí đã gửi phiếu đợt này</AlertTitle>
          <AlertDescription>Câu trả lời cũ đã được điền sẵn. Gửi lại sẽ thay phiếu cũ.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Đồng chí là</CardTitle>
          <CardDescription>Mỗi vai trò có bộ câu hỏi riêng.</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            variant="outline"
            spacing={1}
            value={[role]}
            onValueChange={(v) => v[0] && setRole(v[0] as SurveyRole)}
            disabled={pending}
          >
            {(Object.keys(ROLE_LABELS) as SurveyRole[]).map((r) => (
              <ToggleGroupItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mức độ đồng ý</CardTitle>
          <CardDescription>
            1 là hoàn toàn không đồng ý, 5 là hoàn toàn đồng ý. Đã trả lời {answered}/{questions.length} câu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-8">
            {questions.map((q, i) => (
              <FieldSet key={q.id}>
                <FieldLegend variant="label" className="leading-snug">
                  {i + 1}. {q.text}
                </FieldLegend>
                <RadioGroup
                  className="grid grid-cols-5 gap-2"
                  value={answers[q.id] === undefined ? null : String(answers[q.id])}
                  onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
                  disabled={pending}
                >
                  {SCALE.map((s) => {
                    const id = `${q.id}-${s.value}`;
                    return (
                      <FieldLabel
                        key={s.value}
                        htmlFor={id}
                        title={s.label}
                        className="has-data-checked:border-primary has-data-checked:bg-primary has-data-checked:text-primary-foreground has-data-checked:*:data-[slot=field]:*:text-primary-foreground"
                      >
                        <Field className="items-center gap-1 text-center">
                          {/* Cả ô là vùng chọn và đổi màu khi chọn, nút tròn chỉ giữ cho trình đọc màn hình. */}
                          <RadioGroupItem value={String(s.value)} id={id} aria-label={`${s.value}: ${s.label}`} className="sr-only" />
                          <FieldContent className="items-center">
                            <FieldTitle className="font-heading text-base">{s.value}</FieldTitle>
                            <FieldDescription className="hidden text-xs leading-tight sm:block">{s.label}</FieldDescription>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    );
                  })}
                </RadioGroup>
              </FieldSet>
            ))}

            <Field>
              <FieldLabel htmlFor="ks-gop-y">Góp ý thêm (không bắt buộc)</FieldLabel>
              <Textarea
                id="ks-gop-y"
                rows={4}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={pending}
                placeholder="Điều đồng chí thấy hữu ích, điều cần sửa, tính năng mong muốn…"
              />
              <FieldDescription>Không ghi họ tên, số hiệu hay thông tin cá nhân.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={!complete || pending}>
            {pending ? "Đang gửi…" : initial ? "Gửi lại phiếu" : "Gửi phiếu"}
          </Button>
          {!complete && <span className="text-sm text-muted-foreground">Trả lời đủ các câu để gửi.</span>}
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
