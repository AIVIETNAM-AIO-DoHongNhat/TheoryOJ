"use client";

import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { NOTE_MAX, type ReaderNote } from "../types";

/**
 * Nút "Ghi chú (n)" mở danh sách ghi chú của tài liệu đang đọc. Bấm một ghi chú để tới đúng chỗ;
 * sửa, xóa ngay trong danh sách.
 */
export function NotesPanel({
  notes,
  signedIn,
  onOpen,
  onUpdate,
  onRemove,
  locationLabel,
  size = "sm",
}: {
  notes: ReaderNote[];
  signedIn: boolean;
  onOpen: (n: ReaderNote) => void;
  onUpdate: (id: number, note: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  /** Nhãn vị trí, ví dụ "Trang in 56". */
  locationLabel?: (n: ReaderNote) => string | null;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size={size} aria-label={`Ghi chú của tôi (${notes.length})`} />}>
        <NotebookPen data-icon="inline-start" />
        <span className="hidden sm:inline">Ghi chú</span>
        {notes.length > 0 && <span className="tabular-nums">({notes.length})</span>}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Ghi chú của tôi</SheetTitle>
          <SheetDescription>Bôi đen một đoạn để ghi chú, hỏi trợ lý hoặc tạo thẻ ghi nhớ.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
          {!signedIn ? (
            <p className="text-sm text-muted-foreground">Đăng nhập tài khoản học viên để lưu ghi chú.</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có ghi chú nào trong tài liệu này.</p>
          ) : (
            notes.map((n) => (
              <article key={n.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <button
                  type="button"
                  className="flex flex-col gap-1 text-left"
                  onClick={() => {
                    setOpen(false);
                    onOpen(n);
                  }}
                >
                  {locationLabel?.(n) && <span className="text-xs font-medium text-primary">{locationLabel(n)}</span>}
                  <blockquote className="line-clamp-4 border-l-2 border-primary pl-2 text-sm text-muted-foreground">{n.quote}</blockquote>
                </button>
                {editing === n.id ? (
                  <form
                    className="flex flex-col gap-2"
                    action={async (form) => {
                      await onUpdate(n.id, String(form.get("note") ?? ""));
                      setEditing(null);
                    }}
                  >
                    <Textarea name="note" defaultValue={n.note} autoFocus maxLength={NOTE_MAX} />
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(null)}>
                        Hủy
                      </Button>
                      <Button type="submit" size="xs">
                        Lưu
                      </Button>
                    </div>
                  </form>
                ) : (
                  n.note && <p className="text-sm whitespace-pre-line">{n.note}</p>
                )}
                {editing !== n.id && (
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("vi-VN")}</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => setEditing(n.id)} aria-label="Sửa ghi chú">
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Xóa ghi chú"
                      onClick={() => {
                        if (window.confirm("Xóa ghi chú này?")) void onRemove(n.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
