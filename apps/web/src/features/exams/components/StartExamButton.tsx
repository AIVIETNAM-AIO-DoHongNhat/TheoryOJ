"use client";

import { Play } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { startExam } from "../attempt-actions";
import { durationText } from "../logic";

/** Hỏi lại trước khi bắt đầu, vì đồng hồ chạy ngay cả khi đóng trang. */
export function StartExamButton({ examId, durationMin, label }: { examId: number; durationMin: number; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await startExam(examId);
        if (!res.ok) setError(res.error);
      } catch {
        setError("Chưa bắt đầu được. Thử lại sau ít phút.");
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        <Play data-icon="inline-start" />
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bắt đầu làm bài?</DialogTitle>
          <DialogDescription>
            Đồng chí có {durationText(durationMin)}. Đồng hồ vẫn chạy khi đóng trang hay mất mạng; đáp án được lưu tự động và hết giờ bài được tự nộp.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Để sau</DialogClose>
          <Button onClick={start} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Bắt đầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
