"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactElement, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { errorMessage, unwrap } from "@/lib/action-result";
import { cn } from "@/lib/utils";

import { createNotebook, removeNotebook, saveNotebookSettings } from "../actions";
import {
  COLOR_IDS, DEFAULT_SETTINGS, FONT_IDS, FONT_SIZES, ICON_IDS, NOTEBOOK_COLORS, NOTEBOOK_DESC_MAX, NOTEBOOK_ICONS,
  NOTEBOOK_TITLE_MAX, notebookHref, type NotebookSettings, ORDER_IDS, PAGE_ORDERS, PAPER_IDS, PAPER_STYLES,
} from "../types";
import { ICONS, NotebookCover } from "./NotebookCover";

const GENERAL = "chung";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Ô chọn dạng nút tròn/ô vuông, dùng chung cho màu, biểu tượng, kiểu giấy. */
const choice =
  "relative flex items-center justify-center rounded-lg border bg-card outline-none transition-colors hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:ring-2 aria-checked:ring-primary/30";

/**
 * Hộp tạo sổ mới hoặc tùy chỉnh sổ có sẵn: tên, mô tả, màu bìa, biểu tượng, kiểu giấy, cỡ chữ, thứ tự trang, môn.
 * Có `notebook` là sửa (kèm nút xóa sổ); không có là tạo rồi mở sổ vừa tạo.
 */
export function NotebookSettingsDialog({
  notebook,
  trigger,
  defaultSubject = null,
}: {
  notebook?: NotebookSettings & { id: number; pageCount: number };
  trigger: ReactElement;
  defaultSubject?: string | null;
}) {
  const router = useRouter();
  const initial: NotebookSettings = notebook ?? { ...DEFAULT_SETTINGS, title: "", subject: defaultSubject };
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<NotebookSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof NotebookSettings>(k: K, v: NotebookSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (notebook) {
          unwrap(await saveNotebookSettings({ id: notebook.id, ...s }));
          setOpen(false);
          router.refresh();
        } else {
          const nb = unwrap(await createNotebook(s));
          setOpen(false);
          router.push(notebookHref(nb.id));
        }
      } catch (e) {
        setError(errorMessage(e, "Chưa lưu được. Thử lại sau ít phút."));
      }
    });
  };

  const destroy = () => {
    if (!notebook) return;
    startTransition(async () => {
      try {
        unwrap(await removeNotebook(notebook.id));
        setOpen(false);
        router.push("/so-ghi-chep");
        router.refresh();
      } catch (e) {
        setError(errorMessage(e, "Chưa xóa được sổ. Thử lại sau ít phút."));
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setS(initial);
          setError(null);
          setConfirmDelete(false);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="text-lg">{notebook ? "Tùy chỉnh sổ" : "Sổ ghi chép mới"}</DialogTitle>
          <DialogDescription>Đặt tên, chọn bìa và kiểu giấy cho sổ. Đổi lại lúc nào cũng được.</DialogDescription>
        </DialogHeader>
        <form
          id="notebook-settings"
          className="grid gap-6 p-5 sm:grid-cols-[160px_1fr]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Xem trước bìa và giấy. */}
          <div className="hidden flex-col gap-3 sm:flex">
            <div className="aspect-3/4 w-full">
              <NotebookCover color={s.color} icon={s.icon} size="lg" />
            </div>
            <p className="line-clamp-2 text-center text-sm font-semibold">{s.title || "Tên sổ"}</p>
            <div className={cn("h-24 rounded-md border", `giay-${s.paper}`)} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Section title="Tên và mô tả">
              <Input
                value={s.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={NOTEBOOK_TITLE_MAX}
                required
                autoFocus
                placeholder="Ví dụ: Ôn thi KTCT, Sổ tay khái niệm"
                aria-label="Tên sổ"
              />
              <Textarea
                value={s.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={NOTEBOOK_DESC_MAX}
                placeholder="Sổ này dùng để làm gì (không bắt buộc)"
                aria-label="Mô tả"
                className="min-h-16"
              />
            </Section>

            <Section title="Màu bìa">
              <div role="radiogroup" aria-label="Màu bìa" className="flex flex-wrap gap-2">
                {COLOR_IDS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={s.color === c}
                    aria-label={NOTEBOOK_COLORS[c].label}
                    title={NOTEBOOK_COLORS[c].label}
                    onClick={() => set("color", c)}
                    className={cn(choice, "size-9 rounded-full border-2 border-transparent text-white aria-checked:border-background")}
                    style={{ backgroundColor: NOTEBOOK_COLORS[c].cover }}
                  >
                    {s.color === c && <Check className="size-4" />}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Biểu tượng">
              <div role="radiogroup" aria-label="Biểu tượng" className="grid grid-cols-6 gap-2">
                {ICON_IDS.map((i) => {
                  const Icon = ICONS[i];
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={s.icon === i}
                      aria-label={NOTEBOOK_ICONS[i]}
                      title={NOTEBOOK_ICONS[i]}
                      onClick={() => set("icon", i)}
                      className={cn(choice, "aspect-square text-muted-foreground aria-checked:bg-primary-soft aria-checked:text-primary")}
                    >
                      <Icon className="size-5" />
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Kiểu giấy">
              <div role="radiogroup" aria-label="Kiểu giấy" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAPER_IDS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={s.paper === p}
                    onClick={() => set("paper", p)}
                    className={cn(choice, "flex-col items-stretch gap-0 overflow-hidden p-0 text-left")}
                  >
                    <span className={cn("h-12 border-b", `giay-${p}`)} />
                    <span className="flex flex-col px-2 py-1.5">
                      <span className="text-xs font-medium">{PAPER_STYLES[p].label}</span>
                      <span className="text-[11px] leading-tight text-muted-foreground">{PAPER_STYLES[p].hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <div className="grid gap-6 sm:grid-cols-2">
              <Section title="Cỡ chữ">
                <div role="radiogroup" aria-label="Cỡ chữ" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {FONT_IDS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={s.fontSize === f}
                      onClick={() => set("fontSize", f)}
                      className="rounded-md px-2 py-1.5 font-medium text-muted-foreground transition-colors aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-sm"
                      style={{ fontSize: FONT_SIZES[f].px - 2 }}
                    >
                      {FONT_SIZES[f].label}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Thứ tự trang">
                <Select
                  items={ORDER_IDS.map((o) => ({ value: o, label: PAGE_ORDERS[o] }))}
                  value={s.pageOrder}
                  onValueChange={(v) => v && set("pageOrder", v as NotebookSettings["pageOrder"])}
                >
                  <SelectTrigger className="w-full" aria-label="Thứ tự trang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ORDER_IDS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {PAGE_ORDERS[o]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Section>
            </div>

            <Section title="Môn học">
              <Select
                items={[{ value: GENERAL, label: "Sổ chung, không gắn môn" }, ...ACTIVE_SUBJECTS.map((x) => ({ value: x.id, label: x.name }))]}
                value={s.subject ?? GENERAL}
                onValueChange={(v) => set("subject", !v || v === GENERAL ? null : (v as string))}
              >
                <SelectTrigger className="w-full" aria-label="Môn học">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={GENERAL}>Sổ chung, không gắn môn</SelectItem>
                    {ACTIVE_SUBJECTS.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Sổ gắn môn thì mỗi trang chọn được chương, và trang hiện lại ở bài học của chương đó.</p>
            </Section>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </form>
        <DialogFooter className="sticky bottom-0 m-0 flex-row items-center gap-2 rounded-b-xl border-t bg-popover p-4">
          {notebook &&
            (confirmDelete ? (
              <Button variant="destructive" onClick={destroy} disabled={pending} className="mr-auto">
                {pending ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
                Xóa sổ và {notebook.pageCount} trang
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="mr-auto text-destructive hover:text-destructive">
                <Trash2 data-icon="inline-start" />
                Xóa sổ
              </Button>
            ))}
          <DialogClose render={<Button variant="outline" />}>Hủy</DialogClose>
          <Button type="submit" form="notebook-settings" disabled={pending || !s.title.trim()}>
            {pending && !confirmDelete && <Spinner data-icon="inline-start" />}
            {notebook ? "Lưu" : "Tạo sổ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
