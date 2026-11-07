"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { saveQuestion } from "../actions";
import { firstIssue, LETTERS, MAX_OPTIONS, MIN_OPTIONS, QuestionInput } from "../schema";
import type { QuestionContent } from "../types";

const EMPTY: QuestionContent = { q: "", options: ["", "", "", ""], answer: -1, explain: "", page: null };

/**
 * Soạn câu mới hoặc sửa một câu. Đáp án đúng chọn bằng nút tròn trước mỗi phương án; trang làm bài tự trộn thứ tự,
 * nên không viết "Cả A và B" hay "Tất cả đều đúng".
 */
export function QuestionEditor({
  open,
  onOpenChange,
  subject,
  chapter,
  code,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  chapter: number;
  /** Null: câu mới. */
  code: string | null;
  initial: QuestionContent | null;
  onSaved?: (message: string) => void;
}) {
  // Mỗi lần mở là một phiên soạn mới: thành phần cha đổi `key` theo câu đang sửa.
  const [draft, setDraft] = useState<QuestionContent>(initial ?? EMPTY);
  const [pageText, setPageText] = useState(initial?.page ? String(initial.page) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setOption = (i: number, text: string) => setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? text : o)) }));
  const removeOption = (i: number) =>
    setDraft((d) => ({
      ...d,
      options: d.options.filter((_, j) => j !== i),
      answer: d.answer === i ? -1 : d.answer > i ? d.answer - 1 : d.answer,
    }));

  function save() {
    setError(null);
    const page = pageText.trim() ? Number(pageText.trim()) : null;
    if (page !== null && (!Number.isInteger(page) || page <= 0)) return setError("Trang phải là số nguyên dương.");
    // Bỏ phương án để trống ở cuối trước khi kiểm tra, để soạn câu 2–3 phương án không phải xóa ô thừa.
    let options = [...draft.options];
    while (options.length > MIN_OPTIONS && !options.at(-1)!.trim() && draft.answer < options.length - 1) options = options.slice(0, -1);
    const question = { ...draft, options, page };
    const parsed = QuestionInput.safeParse(question);
    if (!parsed.success) return setError(firstIssue(parsed.error));

    startTransition(async () => {
      try {
        const res = await saveQuestion({ subject, chapter, code, question: parsed.data });
        if (!res.ok) return setError(res.error);
        onOpenChange(false);
        onSaved?.(code ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi.");
      } catch {
        setError("Chưa lưu được. Thử lại sau ít phút.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{code ? "Sửa câu hỏi" : `Thêm câu hỏi chương ${chapter}`}</DialogTitle>
          <DialogDescription>
            {code
              ? `Mã câu ${code}. Học viên thấy bản sửa ngay ở lượt trắc nghiệm tiếp theo; đề thi đã lưu giữ nguyên bản cũ.`
              : "Câu mới vào ngân hàng của chương và có thể được chọn vào đề thi."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="cau-hoi">Câu hỏi</FieldLabel>
            <Textarea
              id="cau-hoi"
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              rows={3}
              placeholder="Ví dụ: Hàng hóa có mấy thuộc tính?"
              autoFocus
            />
          </Field>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1.5 text-sm font-medium">Phương án, bấm vòng tròn để chọn đáp án đúng</legend>
            {draft.options.map((o, i) => {
              const correct = draft.answer === i;
              return (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, answer: i }))}
                    aria-pressed={correct}
                    aria-label={`Chọn phương án ${LETTERS[i]} là đáp án đúng`}
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      correct ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/50 hover:text-primary",
                    )}
                  >
                    {correct ? <Check className="size-4" /> : LETTERS[i]}
                  </button>
                  <Input
                    value={o}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Phương án ${LETTERS[i]}`}
                    aria-label={`Phương án ${LETTERS[i]}`}
                    className={cn("h-9", correct && "border-primary/60 bg-primary-soft")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(i)}
                    disabled={draft.options.length <= MIN_OPTIONS}
                    aria-label={`Xóa phương án ${LETTERS[i]}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
            {draft.options.length < MAX_OPTIONS && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setDraft((d) => ({ ...d, options: [...d.options, ""] }))}
              >
                <Plus data-icon="inline-start" />
                Thêm phương án
              </Button>
            )}
          </fieldset>

          <Field>
            <FieldLabel htmlFor="giai-thich">Giải thích</FieldLabel>
            <Textarea
              id="giai-thich"
              value={draft.explain}
              onChange={(e) => setDraft((d) => ({ ...d, explain: e.target.value }))}
              rows={3}
              placeholder="Vì sao phương án đúng, bám lời văn giáo trình"
            />
            <FieldDescription>Hiện sau khi học viên nộp bài. Nêu thẳng nội dung đúng, không nhắc chữ cái phương án vì thứ tự bị trộn.</FieldDescription>
          </Field>

          <Field className="sm:max-w-48">
            <FieldLabel htmlFor="trang">Trang giáo trình</FieldLabel>
            <Input id="trang" inputMode="numeric" value={pageText} onChange={(e) => setPageText(e.target.value)} placeholder="Ví dụ: 59" className="h-9" />
            <FieldDescription>Trang in ở chân trang, không bắt buộc.</FieldDescription>
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button onClick={save} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {code ? "Lưu thay đổi" : "Thêm câu hỏi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
