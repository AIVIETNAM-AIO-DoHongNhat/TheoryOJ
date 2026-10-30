"use client";

import { History, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubject } from "@/config/subjects";
import { cn } from "@/lib/utils";

import { deleteMyConversation, listMyConversations } from "../actions";
import type { ConversationSummary } from "../server/persist";

const DAY = 24 * 60 * 60 * 1000;

function groupOf(date: Date, now: number): string {
  const age = now - date.getTime();
  if (age < DAY && new Date(now).getDate() === date.getDate()) return "Hôm nay";
  if (age < 7 * DAY) return "7 ngày qua";
  if (age < 30 * DAY) return "30 ngày qua";
  return "Trước đó";
}

/** Danh sách hội thoại đã lưu, mở từ thanh trên của trợ lý. Tải khi mở để luôn mới nhất. */
export function HistorySheet({ currentId, onNewChat }: { currentId?: string; onNewChat: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  // Mốc thời gian để chia nhóm, lấy lúc tải danh sách (không gọi Date.now() khi render).
  const [loadedAt, setLoadedAt] = useState(0);
  const [pending, startTransition] = useTransition();

  const load = () =>
    startTransition(async () => {
      const list = await listMyConversations();
      setLoadedAt(Date.now());
      setItems(list);
    });
  const remove = (id: string) =>
    startTransition(async () => {
      await deleteMyConversation(id);
      setItems((prev) => prev?.filter((c) => c.id !== id) ?? null);
      if (id === currentId) {
        setOpen(false);
        onNewChat();
      }
    });

  const groups = new Map<string, ConversationSummary[]>();
  for (const c of items ?? []) {
    const g = groupOf(new Date(c.updatedAt), loadedAt);
    groups.set(g, [...(groups.get(g) ?? []), c]);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
    >
      <SheetTrigger render={<Button variant="ghost" size="sm" />}>
        <History data-icon="inline-start" />
        Lịch sử
      </SheetTrigger>
      <SheetContent side="left" className="w-full gap-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Hội thoại đã lưu</SheetTitle>
          <SheetDescription>Lưu cho trình duyệt này. Xóa dữ liệu trình duyệt thì danh sách sẽ mất.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3">
          {items === null ? (
            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)
          ) : items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><MessageSquare /></EmptyMedia>
                <EmptyTitle>Chưa có hội thoại</EmptyTitle>
                <EmptyDescription>Các câu hỏi đồng chí gửi trợ lý sẽ được lưu ở đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            [...groups].map(([label, list]) => (
              <section key={label} className="flex flex-col gap-0.5">
                <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">{label}</h3>
                {list.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-muted",
                      c.id === currentId && "bg-primary-soft hover:bg-primary-soft",
                    )}
                  >
                    <Link
                      href={`/tro-ly/${c.id}`}
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2"
                    >
                      <span className="truncate text-sm font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{getSubject(c.subject)?.shortName ?? c.subject}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      aria-label={`Xóa hội thoại ${c.title}`}
                      className="opacity-60 group-hover:opacity-100"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
