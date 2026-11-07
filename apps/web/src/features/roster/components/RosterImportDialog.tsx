"use client";

import { Check, CircleAlert, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { importRoster } from "../actions";
import { parseRosterText } from "../parse";

const SAMPLE = `Mã học viên\tHọ và tên\tLớp
B2K60-001\tNguyễn Văn An\tB2K60
B2K60-002\tTrần Thị Bình\tB2K60
B2K61-001\tLê Văn Cường\tB2K61`;

/** Dán danh sách học viên chép từ Excel (ba cột: mã, họ tên, lớp). Xem trước từng dòng, dòng lỗi báo kèm số dòng. */
export function RosterImportDialog({ onDone }: { onDone?: (message: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const deferred = useDeferredValue(text);
  const parsed = useMemo(() => parseRosterText(deferred), [deferred]);
  const bad = parsed.filter((p) => p.error);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await importRoster({ text });
        if (!res.ok) return setError(res.error);
        setOpen(false);
        setText("");
        const parts = [`thêm ${res.added}`, `cập nhật ${res.updated}`];
        if (res.synced) parts.push(`đồng bộ họ tên, lớp cho ${res.synced} tài khoản đã đăng ký`);
        onDone?.(`Đã nhập danh sách: ${parts.join(", ")}.`);
        router.refresh();
      } catch {
        setError("Chưa nhập được. Thử lại sau ít phút.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <FileUp data-icon="inline-start" />
        Nhập danh sách
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nhập danh sách học viên</DialogTitle>
          <DialogDescription>
            Chép ba cột <b>mã học viên, họ tên, lớp</b> từ Excel rồi dán vào đây (gõ tay thì ngăn cột bằng dấu chấm phẩy). Mã đã có trong
            danh sách được cập nhật họ tên, lớp; tài khoản đã đăng ký cũng được đổi theo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              placeholder={SAMPLE}
              aria-label="Danh sách học viên"
              className="min-h-72 font-mono text-[13px] leading-relaxed"
            />
            {!text && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setText(SAMPLE)}>
                Dùng văn bản mẫu
              </Button>
            )}
          </div>

          <div className="flex max-h-[26rem] min-h-40 flex-col gap-1.5 overflow-y-auto rounded-xl border bg-subtle p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {parsed.length ? `Đọc được ${parsed.length} dòng${bad.length ? `, ${bad.length} dòng lỗi` : ", không có lỗi"}` : "Xem trước hiện ở đây"}
            </p>
            {parsed.map((p) => (
              <div
                key={p.line}
                className={cn("flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm", p.error && "border-destructive/50")}
              >
                {p.data ? <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />}
                <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">Dòng {p.line}</span>
                {p.data ? (
                  <span className="flex min-w-0 flex-1 flex-wrap gap-x-3">
                    <span className="font-mono text-xs">{p.data.studentCode}</span>
                    <span className="font-medium">{p.data.fullName}</span>
                    <span className="text-muted-foreground">{p.data.className}</span>
                  </span>
                ) : (
                  <span className="text-destructive">{p.error}</span>
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
            {bad.length ? `Sửa ${bad.length} dòng lỗi để nhập` : `Nhập ${parsed.length || ""} học viên`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
