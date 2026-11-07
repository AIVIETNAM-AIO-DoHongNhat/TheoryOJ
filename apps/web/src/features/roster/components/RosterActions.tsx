"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { removeRosterEntry } from "../actions";
import { RosterImportDialog } from "./RosterImportDialog";

/** Nút nhập danh sách kèm dòng thông báo kết quả, đặt ở đầu trang /quan-tri/danh-sach. */
export function RosterToolbar() {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <RosterImportDialog onDone={setNotice} />
      {notice && (
        <Alert className="max-w-md">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** Bỏ một mã khỏi danh sách. Tài khoản đã đăng ký vẫn đăng nhập được. */
export function RemoveRosterButton({ studentCode, fullName, registered }: { studentCode: string; fullName: string; registered: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    const warn = registered ? " Tài khoản đã đăng ký vẫn đăng nhập được, nhưng lần nhập danh sách sau sẽ không đồng bộ lớp cho tài khoản này nữa." : "";
    if (!window.confirm(`Bỏ ${fullName} (${studentCode}) khỏi danh sách?${warn}`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await removeRosterEntry(studentCode);
        if (!res.ok) return setError(res.error);
        router.refresh();
      } catch {
        setError("Chưa xóa được.");
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button variant="ghost" size="icon-sm" onClick={remove} disabled={pending} aria-label={`Bỏ ${studentCode} khỏi danh sách`}>
        {pending ? <Spinner /> : <Trash2 />}
      </Button>
    </span>
  );
}
