"use client";

import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { sendFeedback } from "../actions";
import { FEEDBACK_REASONS, type FeedbackReason } from "../feedback";

/** Sao chép và đánh giá 👍/👎 dưới mỗi câu trả lời. 👎 hỏi thêm lý do để giảng viên lọc trong nhật ký. */
export function FeedbackBar({ messageId, text, initial }: { messageId: string; text: string; initial?: 1 | -1 }) {
  const [rating, setRating] = useState<1 | -1 | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (value: 1 | -1) =>
    startTransition(async () => {
      const res = await sendFeedback({ messageId, rating: value, reason: value === -1 ? reason : null, comment: value === -1 ? comment : null });
      setFailed(!res.ok);
      if (res.ok) {
        setRating(value);
        setOpen(false);
      }
    });

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="-ml-1.5 flex items-center gap-0.5 text-muted-foreground">
      <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Sao chép câu trả lời" disabled={!text}>
        {copied ? <Check /> : <Copy />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => submit(1)}
        disabled={pending}
        aria-label="Câu trả lời hữu ích"
        aria-pressed={rating === 1}
        className={cn(rating === 1 && "text-primary")}
      >
        <ThumbsUp className={cn(rating === 1 && "fill-current")} />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Câu trả lời chưa tốt"
              aria-pressed={rating === -1}
              className={cn(rating === -1 && "text-destructive")}
            />
          }
        >
          <ThumbsDown className={cn(rating === -1 && "fill-current")} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <PopoverHeader>
            <PopoverTitle>Câu trả lời chưa tốt ở đâu?</PopoverTitle>
            <PopoverDescription>Giảng viên dùng góp ý này để rà soát và sửa trợ lý.</PopoverDescription>
          </PopoverHeader>
          <FieldGroup className="gap-3">
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={1}
              className="w-full flex-wrap"
              value={reason ? [reason] : []}
              onValueChange={(v) => setReason((v[0] as FeedbackReason | undefined) ?? null)}
            >
              {FEEDBACK_REASONS.map((r) => (
                <ToggleGroupItem key={r} value={r} className="text-xs">{r}</ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Field>
              <FieldLabel htmlFor={`fb-${messageId}`}>Ghi chú thêm (không bắt buộc)</FieldLabel>
              <Textarea
                id={`fb-${messageId}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Ví dụ: giáo trình định nghĩa ở trang 59 khác với câu trả lời."
              />
            </Field>
            {failed && <p className="text-xs text-destructive">Chưa gửi được góp ý. Đồng chí thử lại sau.</p>}
            <Button size="sm" onClick={() => submit(-1)} disabled={pending || !reason}>Gửi góp ý</Button>
          </FieldGroup>
        </PopoverContent>
      </Popover>
      {rating !== null && !open && <span className="ml-1 text-xs">Đã ghi nhận đánh giá</span>}
    </div>
  );
}
