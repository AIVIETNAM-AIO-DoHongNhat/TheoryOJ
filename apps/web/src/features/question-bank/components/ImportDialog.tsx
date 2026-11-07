"use client";

import { Check, CircleAlert, FileUp } from "lucide-react";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { importQuestions } from "../actions";
import { LETTERS, parseQuestionText } from "../schema";

const SAMPLE = `Câu 1: Hàng hóa có mấy thuộc tính?
A. Một thuộc tính
*B. Hai thuộc tính
C. Ba thuộc tính
D. Bốn thuộc tính
Giải thích: Hàng hóa có hai thuộc tính là giá trị sử dụng và giá trị.
Trang: 32

Câu 2: Lượng giá trị của hàng hóa được đo bằng gì?
A. Thời gian lao động cá biệt
B. Thời gian lao động xã hội cần thiết
C. Giá cả thị trường
Đáp án: B`;

/** Dán nhiều câu (chép từ Word, đề cương) vào một chương. Xem trước từng câu, câu lỗi báo kèm số dòng. */
export function ImportDialog({ subject, chapter, onDone }: { subject: string; chapter: number; onDone?: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const deferred = useDeferredValue(text);
  const parsed = useMemo(() => parseQuestionText(deferred), [deferred]);
  const bad = parsed.filter((p) => !p.data);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await importQuestions({ subject, chapter, text });
        if (!res.ok) return setError(res.error);
        setOpen(false);
        setText("");
        onDone?.(`Đã nhập ${res.count} câu vào chương ${chapter}.`);
      } catch {
        setError("Chưa nhập được. Thử lại sau ít phút.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="bg-card" />}>
        <FileUp data-icon="inline-start" />
        Nhập nhiều câu
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Nhập nhiều câu vào chương {chapter}</DialogTitle>
          <DialogDescription>
            Dán văn bản chép từ Word. Mỗi câu một dòng câu hỏi, các phương án bắt đầu bằng A., B., C.…; đánh dấu đáp án đúng bằng dấu * trước chữ cái
            hoặc thêm dòng &ldquo;Đáp án: B&rdquo;. Dòng &ldquo;Giải thích:&rdquo; và &ldquo;Trang:&rdquo; không bắt buộc.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              placeholder={SAMPLE}
              aria-label="Văn bản câu hỏi"
              className="min-h-80 font-mono text-[13px] leading-relaxed"
            />
            {!text && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setText(SAMPLE)}>
                Dùng văn bản mẫu
              </Button>
            )}
          </div>

          <div className="flex max-h-[28rem] min-h-40 flex-col gap-2 overflow-y-auto rounded-xl border bg-subtle p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {parsed.length ? `Đọc được ${parsed.length} câu${bad.length ? `, ${bad.length} câu lỗi` : ", không có lỗi"}` : "Xem trước hiện ở đây"}
            </p>
            {parsed.map((p) => (
              <div key={`${p.index}-${p.line}`} className={cn("rounded-lg border bg-card p-3 text-sm", !p.data && "border-destructive/50")}>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {p.data ? <Check className="size-3.5 text-primary" /> : <CircleAlert className="size-3.5 text-destructive" />}
                  Câu {p.index} · dòng {p.line}
                  {p.data?.page && <span>· tr. {p.data.page}</span>}
                </div>
                {p.data ? (
                  <>
                    <p className="font-medium leading-snug">{p.data.q}</p>
                    <ul className="mt-1.5 flex flex-col gap-0.5 text-[13px]">
                      {p.data.options.map((o, i) => (
                        <li key={i} className={cn(i === p.data!.answer ? "font-medium text-primary" : "text-muted-foreground")}>
                          {LETTERS[i]}. {o}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-destructive">{p.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button onClick={submit} disabled={pending || parsed.length === 0 || bad.length > 0}>
            {pending && <Spinner data-icon="inline-start" />}
            {bad.length ? `Sửa ${bad.length} câu lỗi để nhập` : `Nhập ${parsed.length || ""} câu`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
