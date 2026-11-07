"use client";

import { Check, Eraser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { gradeByLecturer } from "@/features/open-answer/admin-actions";

/** Giảng viên nhập điểm của mình cho một bài; học viên thấy điểm này thay cho điểm hệ thống. */
export function LecturerScoreForm({ id, maxScore, score, note, aiScore }: {
  id: number;
  maxScore: number;
  score: number | null;
  note: string | null;
  aiScore: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(score === null ? "" : String(score).replace(".", ","));
  const [text, setText] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const save = (clear = false) =>
    start(async () => {
      setError(null);
      setSaved(false);
      const parsed = clear ? null : Number(value.replace(",", "."));
      if (!clear && (value.trim() === "" || Number.isNaN(parsed))) {
        setError("Nhập điểm, ví dụ 7,5.");
        return;
      }
      const r = await gradeByLecturer({ id, score: parsed, note: clear ? null : text });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (clear) {
        setValue("");
        setText("");
      }
      setSaved(true);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Chấm độc lập trước khi xem điểm hệ thống nếu có thể, để số liệu đồng thuận khách quan. Hệ thống chấm: {aiScore.toLocaleString("vi-VN")}/{maxScore}.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Điểm của giảng viên (thang {maxScore}, bội của 0,25)
        <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ví dụ 7,5" className="max-w-40" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nhận xét cho học viên (không bắt buộc)
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => save()} disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
          Lưu điểm
        </Button>
        {score !== null && (
          <Button variant="ghost" onClick={() => save(true)} disabled={pending}>
            <Eraser data-icon="inline-start" />
            Xóa điểm đã chấm
          </Button>
        )}
        {saved && <span className="text-sm text-primary">Đã lưu.</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
