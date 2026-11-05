"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { resetStudentPassword } from "../actions";

/** Hỏi xác nhận, đặt lại mật khẩu, rồi hiện mật khẩu tạm một lần để giảng viên báo cho học viên. */
export function ResetPasswordButton({ userId, fullName }: { userId: string; fullName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setError(null);
    startTransition(async () => {
      try {
        setPassword((await resetStudentPassword(userId)).password);
      } catch {
        setError("Chưa đặt lại được mật khẩu. Thử lại sau ít phút.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setPassword(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <KeyRound data-icon="inline-start" />
        Đặt lại mật khẩu
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{password ? "Mật khẩu tạm" : "Đặt lại mật khẩu?"}</DialogTitle>
          <DialogDescription>
            {password
              ? `Báo mật khẩu này cho ${fullName}. Học viên đăng nhập rồi đổi mật khẩu ở trang Tài khoản. Mật khẩu chỉ hiện một lần.`
              : `${fullName} sẽ bị đăng xuất trên mọi thiết bị và cần đăng nhập lại bằng mật khẩu tạm. Tiến độ học tập giữ nguyên.`}
          </DialogDescription>
        </DialogHeader>
        {password && (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-subtle px-4 py-3">
            <code className="font-mono text-xl tracking-wider">{password}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(password);
                setCopied(true);
              }}
            >
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied ? "Đã chép" : "Chép"}
            </Button>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{password ? "Xong" : "Hủy"}</DialogClose>
          {!password && (
            <Button onClick={reset} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Đặt lại
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
