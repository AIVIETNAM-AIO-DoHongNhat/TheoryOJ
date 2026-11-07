"use client";

import { Copy, EllipsisVertical, Lock, Pencil, Send, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";

import { closeExamNow, deleteExam, duplicateExam, setExamStatus } from "../actions";
import type { ExamPhase } from "../logic";

type Pending = "xoa" | "dong" | "thu-hoi" | null;

const CONFIRM: Record<Exclude<Pending, null>, { title: string; text: string; cta: string }> = {
  xoa: { title: "Xóa đề thi?", text: "Đề và mọi bài làm của học viên bị xóa hẳn, không khôi phục được.", cta: "Xóa đề" },
  dong: { title: "Đóng đề ngay?", text: "Học viên không bắt đầu được lượt mới. Bài đang làm được tự nộp theo phần đã lưu.", cta: "Đóng đề" },
  "thu-hoi": { title: "Thu hồi về bản nháp?", text: "Học viên không thấy đề nữa, bài đã nộp vẫn được giữ. Giao lại bất cứ lúc nào.", cta: "Thu hồi" },
};

/** Nút sửa, giao, thu hồi, đóng, sao chép, xóa ở đầu trang kết quả của một đề. */
export function ExamAdminActions({ id, phase }: { id: number; phase: ExamPhase }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult<{ id?: number }>>, after?: (res: { id?: number }) => void) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) return setError(res.error);
        setConfirm(null);
        after?.(res);
      } catch {
        setError("Chưa thực hiện được. Thử lại sau ít phút.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href={`/quan-tri/de-thi/${id}/sua`} />} nativeButton={false}>
          <Pencil data-icon="inline-start" />
          Sửa đề
        </Button>
        {phase === "nhap" && (
          <Button onClick={() => run(() => setExamStatus({ id, status: "da-giao" }))} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            Giao đề
          </Button>
        )}
        {phase === "dang-mo" && (
          <Button variant="outline" onClick={() => setConfirm("dong")}>
            <Lock data-icon="inline-start" />
            Đóng đề ngay
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Thao tác khác" />}>
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => run(() => duplicateExam(id), (res) => res.id && router.push(`/quan-tri/de-thi/${res.id}/sua`))}>
                <Copy />
                Sao chép thành đề mới
              </DropdownMenuItem>
              {phase !== "nhap" && (
                <DropdownMenuItem onClick={() => setConfirm("thu-hoi")}>
                  <Undo2 />
                  Thu hồi về bản nháp
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirm("xoa")}>
              <Trash2 />
              Xóa đề
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && !confirm && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{CONFIRM[confirm].title}</DialogTitle>
                <DialogDescription>{CONFIRM[confirm].text}</DialogDescription>
              </DialogHeader>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
                <Button
                  variant={confirm === "xoa" ? "destructive" : "default"}
                  disabled={pending}
                  onClick={() =>
                    confirm === "xoa"
                      ? run(() => deleteExam(id), () => router.push("/quan-tri/de-thi"))
                      : confirm === "dong"
                        ? run(() => closeExamNow(id))
                        : run(() => setExamStatus({ id, status: "nhap" }))
                  }
                >
                  {pending && <Spinner data-icon="inline-start" />}
                  {CONFIRM[confirm].cta}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
