"use client";

import { Download, RotateCcw, Search, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Initials, TH } from "@/features/admin/components/AdminUi";
import { cn } from "@/lib/utils";

import { resetStudentAttempts } from "../actions";
import { EXAM_PASS_RATIO, score10 } from "../logic";
import { formatVnTime } from "../time";
import type { AttemptInfo } from "../types";

export interface StudentRow {
  userId: string;
  studentCode: string;
  fullName: string;
  className: string;
  outsideClasses: boolean;
  attempts: AttemptInfo[];
  best: { score: number; total: number } | null;
  inProgress: boolean;
}

const FILTERS = [
  { value: "tat-ca", label: "Tất cả" },
  { value: "da-nop", label: "Đã nộp" },
  { value: "dang-lam", label: "Đang làm" },
  { value: "chua-lam", label: "Chưa làm" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const status = (s: StudentRow): Exclude<Filter, "tat-ca"> => (s.inProgress ? "dang-lam" : s.best ? "da-nop" : "chua-lam");

const minutes = (a: AttemptInfo) =>
  a.submittedAt ? Math.max(1, Math.round((new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 60_000)) : null;

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLowerCase();

/** Ghi CSV có BOM để Excel mở đúng tiếng Việt. */
function downloadCsv(title: string, rows: StudentRow[]) {
  const head = ["Mã học viên", "Họ tên", "Lớp", "Trạng thái", "Số lượt", "Đúng", "Tổng câu", "Điểm (thang 10)", "Nộp lúc", "Phút làm"];
  const label = { "da-nop": "Đã nộp", "dang-lam": "Đang làm", "chua-lam": "Chưa làm" };
  const lines = rows.map((s) => {
    const done = s.attempts.filter((a) => a.submittedAt);
    const last = done.at(-1);
    return [
      s.studentCode, s.fullName, s.className, label[status(s)], done.length,
      s.best?.score ?? "", s.best?.total ?? "", s.best ? score10(s.best.score, s.best.total) : "",
      last ? formatVnTime(last.submittedAt) : "", last ? minutes(last) : "",
    ];
  });
  const csv = [head, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "ket-qua"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Bảng học viên được giao đề: trạng thái, điểm lượt cao nhất, thời gian làm; cho làm lại; xuất CSV. */
export function StudentResults({ examId, title, students }: { examId: number; title: string; students: StudentRow[] }) {
  const [filter, setFilter] = useState<Filter>("tat-ca");
  const [q, setQ] = useState("");
  const [resetting, setResetting] = useState<StudentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { "tat-ca": students.length, "da-nop": 0, "dang-lam": 0, "chua-lam": 0 };
    for (const s of students) c[status(s)]++;
    return c;
  }, [students]);

  const shown = useMemo(() => {
    const needle = norm(q.trim());
    return students
      .filter((s) => filter === "tat-ca" || status(s) === filter)
      .filter((s) => !needle || norm(`${s.studentCode} ${s.fullName} ${s.className}`).includes(needle));
  }, [students, filter, q]);

  function reset() {
    if (!resetting) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await resetStudentAttempts({ examId, userId: resetting.userId });
        if (!res.ok) return setError(res.error);
        setResetting(null);
      } catch {
        setError("Chưa thực hiện được. Thử lại sau ít phút.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b px-5 py-3.5 lg:flex-row lg:items-center">
        <InputGroup className="h-9 bg-background lg:w-72">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã, họ tên, lớp" aria-label="Tìm học viên" />
        </InputGroup>
        <ToggleGroup variant="outline" size="sm" spacing={1} className="flex-wrap" value={[filter]} onValueChange={(v) => v[0] && setFilter(v[0] as Filter)}>
          {FILTERS.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value} className="bg-background aria-pressed:bg-primary-soft aria-pressed:text-primary">
              {f.label}
              <span className="tabular-nums text-muted-foreground">{counts[f.value]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" className="lg:ml-auto" onClick={() => downloadCsv(title, shown)} disabled={shown.length === 0}>
          <Download data-icon="inline-start" />
          Xuất CSV
        </Button>
      </div>

      {shown.length === 0 ? (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundSearch />
            </EmptyMedia>
            <EmptyTitle>Không có học viên phù hợp</EmptyTitle>
            <EmptyDescription>Học viên cần đăng ký tài khoản đúng lớp được giao thì mới thấy đề.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(TH, "pl-5")}>Học viên</TableHead>
              <TableHead className={TH}>Lớp</TableHead>
              <TableHead className={TH}>Trạng thái</TableHead>
              <TableHead className={cn(TH, "text-right")}>Điểm</TableHead>
              <TableHead className={cn(TH, "text-right")}>Lượt</TableHead>
              <TableHead className={TH}>Nộp lúc</TableHead>
              <TableHead className={cn(TH, "w-10 pr-4")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((s) => {
              const st = status(s);
              const done = s.attempts.filter((a) => a.submittedAt);
              const last = done.at(-1);
              const ratio = s.best ? s.best.score / s.best.total : null;
              return (
                <TableRow key={s.userId}>
                  <TableCell className="py-2.5 pl-5">
                    <Link href={`/quan-tri/hoc-vien/${encodeURIComponent(s.studentCode)}`} className="group flex items-center gap-3">
                      <Initials name={s.fullName} />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="font-medium group-hover:text-primary">{s.fullName}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{s.studentCode}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex h-6 items-center rounded-md border bg-background px-2 text-xs font-medium">{s.className}</span>
                    {s.outsideClasses && <span className="ml-1.5 text-[11px] text-warn">ngoài lớp được giao</span>}
                  </TableCell>
                  <TableCell>
                    {st === "da-nop" ? (
                      <Badge variant="outline" className="border-primary/30 bg-primary-soft text-primary">
                        {last?.autoSubmitted ? "Tự nộp khi hết giờ" : "Đã nộp"}
                      </Badge>
                    ) : st === "dang-lam" ? (
                      <Badge variant="outline" className="border-warn/30 bg-warn-soft text-warn">Đang làm</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa làm</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.best ? (
                      <span className="flex flex-col items-end leading-tight">
                        <b className={cn("font-heading text-base", ratio! >= EXAM_PASS_RATIO ? "text-primary" : "text-destructive")}>
                          {score10(s.best.score, s.best.total)}
                        </b>
                        <span className="text-[11px] text-muted-foreground">{s.best.score}/{s.best.total} câu</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{done.length || <span className="text-muted-foreground/60">—</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {last ? (
                      <span className="flex flex-col leading-tight">
                        {formatVnTime(last.submittedAt)}
                        <span>{minutes(last)} phút</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    {s.attempts.length > 0 && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setResetting(s)} aria-label={`Cho ${s.fullName} làm lại`} title="Cho làm lại">
                        <RotateCcw />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cho {resetting?.fullName} làm lại?</DialogTitle>
            <DialogDescription>
              Xóa {resetting?.attempts.length} lượt làm của học viên trong đề này, kể cả lượt đang làm. Học viên làm lại từ đầu nếu đề còn mở.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
            <Button variant="destructive" onClick={reset} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Xóa lượt làm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
