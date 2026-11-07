"use client";

import {
  BookOpen, Check, CircleCheck, EllipsisVertical, Eye, EyeOff, FilePlus2, History, Pencil, Search, SearchX, Trash2, X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { deleteQuestion, restoreQuestion, setChapterReviewed, setQuestionHidden } from "../actions";
import { LETTERS } from "../schema";
import { type AdminQuestion, SOURCE_LABELS } from "../types";
import { ImportDialog } from "./ImportDialog";
import { QuestionEditor } from "./QuestionEditor";

const FILTERS = [
  { value: "tat-ca", label: "Tất cả" },
  { value: "goc", label: "Gốc" },
  { value: "da-sua", label: "Đã sửa" },
  { value: "moi", label: "Giảng viên soạn" },
  { value: "an", label: "Đã ẩn" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

type Confirm = { kind: "xoa" | "khoi-phuc"; question: AdminQuestion } | null;

/** Quản lý câu hỏi của một chương. Lọc, tìm chạy ngay trên trình duyệt; mỗi thao tác ghi xong thì trang tự tải lại số liệu. */
export function QuestionManager({
  subject,
  chapter,
  questions,
  reviewed,
}: {
  subject: string;
  chapter: number;
  questions: AdminQuestion[];
  reviewed: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("tat-ca");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ key: number; question: AdminQuestion | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = useMemo(() => {
    const needle = norm(q.trim());
    return questions
      .map((x, i) => ({ x, n: i + 1 }))
      .filter(({ x }) =>
        filter === "tat-ca" ? true : filter === "an" ? x.hidden : x.source === filter && !x.hidden,
      )
      .filter(({ x }) => !needle || norm(`${x.code} ${x.q} ${x.options.join(" ")} ${x.explain}`).includes(needle));
  }, [questions, filter, q]);

  const counts: Record<Filter, number> = {
    "tat-ca": questions.length,
    goc: questions.filter((x) => x.source === "goc" && !x.hidden).length,
    "da-sua": questions.filter((x) => x.source === "da-sua" && !x.hidden).length,
    moi: questions.filter((x) => x.source === "moi" && !x.hidden).length,
    an: questions.filter((x) => x.hidden).length,
  };

  /** Chạy một thao tác ghi, báo kết quả ở đầu danh sách. */
  function run(key: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setNotice(null);
    setBusy(key);
    startTransition(async () => {
      try {
        const res = await action();
        setNotice(res.ok ? { tone: "ok", text: success } : { tone: "error", text: res.error });
      } catch {
        setNotice({ tone: "error", text: "Chưa thực hiện được. Thử lại sau ít phút." });
      } finally {
        setBusy(null);
        setConfirm(null);
      }
    });
  }

  const openEditor = (question: AdminQuestion | null) => setEditing({ key: Date.now(), question });

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b px-5 py-3.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <InputGroup className="h-9 bg-background sm:w-72">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong câu hỏi, phương án, mã câu" aria-label="Tìm câu hỏi" />
          </InputGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={1}
            className="flex-wrap"
            value={[filter]}
            onValueChange={(v) => v[0] && setFilter(v[0] as Filter)}
            aria-label="Lọc theo nguồn câu hỏi"
          >
            {FILTERS.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value} className="bg-background aria-pressed:bg-primary-soft aria-pressed:text-primary">
                {f.label}
                <span className="tabular-nums text-muted-foreground">{counts[f.value]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 inline-flex cursor-pointer items-center gap-2 text-[13px]">
            <Switch
              checked={reviewed}
              disabled={pending}
              onCheckedChange={(on) =>
                run("duyet", () => setChapterReviewed({ subject, chapter, reviewed: on }), on ? "Đã đánh dấu chương đã duyệt." : "Đã bỏ duyệt chương.")
              }
            />
            {reviewed ? "Đã duyệt bộ câu" : "Chưa duyệt"}
          </label>
          <ImportDialog subject={subject} chapter={chapter} onDone={(text) => setNotice({ tone: "ok", text })} />
          <Button onClick={() => openEditor(null)}>
            <FilePlus2 data-icon="inline-start" />
            Thêm câu hỏi
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.tone === "error" ? "destructive" : "default"} className="mx-5 mt-4 w-auto">
          {notice.tone === "ok" ? <CircleCheck /> : <X />}
          <AlertDescription className="flex items-center justify-between gap-3">
            {notice.text}
            <Button variant="ghost" size="icon-xs" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              <X />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {shown.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{questions.length ? "Không có câu phù hợp" : "Chương chưa có câu hỏi"}</EmptyTitle>
            <EmptyDescription>
              {questions.length ? "Đổi bộ lọc hoặc từ khóa tìm kiếm." : "Thêm từng câu hoặc dán nhiều câu một lần bằng nút Nhập nhiều câu."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ol className="flex flex-col divide-y">
          {shown.map(({ x, n }) => (
            <li key={x.code} className={cn("flex gap-4 px-5 py-4", x.hidden && "bg-muted/30")}>
              <span className="mt-0.5 inline-flex h-6 min-w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft px-1 font-mono text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                {n}
              </span>
              <div className={cn("flex min-w-0 flex-1 flex-col gap-2", x.hidden && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono">{x.code}</span>
                  {x.source !== "goc" && <Badge variant={x.source === "moi" ? "tint" : "outline"}>{SOURCE_LABELS[x.source]}</Badge>}
                  {x.hidden && (
                    <Badge variant="outline" className="border-warn/40 text-warn">
                      <EyeOff />
                      Đang ẩn
                    </Badge>
                  )}
                  {x.page && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3" />
                      tr. {x.page}
                    </span>
                  )}
                  {x.attempts > 0 && x.correctRate !== null && (
                    <span title={`${x.attempts} lượt làm trong trắc nghiệm ôn tập`}>
                      · Đúng{" "}
                      <b className={cn("tabular-nums", x.correctRate >= 0.7 ? "text-primary" : x.correctRate >= 0.4 ? "text-warn" : "text-destructive")}>
                        {Math.round(x.correctRate * 100)}%
                      </b>{" "}
                      / {x.attempts} lượt
                    </span>
                  )}
                  {x.updatedBy && <span>· sửa bởi {x.updatedBy}</span>}
                </div>
                <p className="font-medium leading-snug">{x.q}</p>
                <ul className="grid gap-1 text-[13px] sm:grid-cols-2">
                  {x.options.map((o, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex gap-1.5 rounded-md px-2 py-1",
                        i === x.answer ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground",
                      )}
                    >
                      <span className="font-semibold">{LETTERS[i]}.</span>
                      <span className="min-w-0">{o}</span>
                      {i === x.answer && <Check className="ml-auto size-3.5 shrink-0" aria-label="Đáp án đúng" />}
                    </li>
                  ))}
                </ul>
                {x.explain && <p className="text-[13px] leading-relaxed text-muted-foreground">{x.explain}</p>}
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => openEditor(x)} aria-label={`Sửa câu ${n}`}>
                  <Pencil />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Thao tác khác với câu ${n}`} />}>
                    {busy?.endsWith(x.code) ? <Spinner /> : <EllipsisVertical />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() =>
                          run(`an:${x.code}`, () => setQuestionHidden({ subject, chapter, code: x.code, hidden: !x.hidden }),
                            x.hidden ? "Đã hiện lại câu cho học viên." : "Đã ẩn câu khỏi trắc nghiệm của học viên.")
                        }
                      >
                        {x.hidden ? <Eye /> : <EyeOff />}
                        {x.hidden ? "Hiện lại" : "Ẩn khỏi học viên"}
                      </DropdownMenuItem>
                      {x.source === "da-sua" && (
                        <DropdownMenuItem onClick={() => setConfirm({ kind: "khoi-phuc", question: x })}>
                          <History />
                          Khôi phục bản gốc
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    {x.source === "moi" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "xoa", question: x })}>
                          <Trash2 />
                          Xóa câu
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <QuestionEditor
          key={editing.key}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          subject={subject}
          chapter={chapter}
          code={editing.question?.code ?? null}
          initial={editing.question}
          onSaved={(text) => setNotice({ tone: "ok", text })}
        />
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.kind === "xoa" ? "Xóa câu hỏi?" : "Khôi phục bản gốc?"}</DialogTitle>
            <DialogDescription>
              {confirm?.kind === "xoa"
                ? "Câu bị xóa khỏi ngân hàng của chương. Đề thi đã lưu vẫn giữ bản chép của câu; kết quả ôn tập cũ không đổi."
                : "Bỏ bản sửa, dùng lại nội dung trong giáo trình gốc. Câu cũng được hiện lại nếu đang ẩn."}
            </DialogDescription>
          </DialogHeader>
          {confirm?.kind === "khoi-phuc" && confirm.question.original && (
            <div className="rounded-lg border bg-subtle p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">Bản gốc</p>
              <p className="font-medium">{confirm.question.original.q}</p>
              <p className="mt-1 text-primary">
                Đáp án: {LETTERS[confirm.question.original.answer]}. {confirm.question.original.options[confirm.question.original.answer]}
              </p>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
            <Button
              variant={confirm?.kind === "xoa" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => {
                if (!confirm) return;
                const { code } = confirm.question;
                if (confirm.kind === "xoa") run(`xoa:${code}`, () => deleteQuestion({ subject, chapter, code }), "Đã xóa câu hỏi.");
                else run(`kp:${code}`, () => restoreQuestion({ subject, chapter, code }), "Đã khôi phục bản gốc.");
              }}
            >
              {pending && <Spinner data-icon="inline-start" />}
              {confirm?.kind === "xoa" ? "Xóa" : "Khôi phục"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
