"use client";

import { Ban, Check, CheckCheck, ChevronDown, Flag, Inbox, MessageSquareQuote, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODES, type ModeId } from "@/features/chat/modes";
import { cn } from "@/lib/utils";

import { setReviewed } from "../actions";
import { REFUSAL_LABELS, REVIEW_FILTER_LABELS, REVIEW_FILTERS, type ReviewFilter, type ReviewItem } from "../types";
import { dateTime } from "./AdminHeading";
import { Initials } from "./AdminUi";

const FILTER_ICONS: Record<ReviewFilter, typeof Flag> = {
  "gan-co": Flag,
  "danh-gia": ThumbsDown,
  "tu-choi": Ban,
  "tat-ca": Inbox,
};

/** Tab lọc, công tắc "chỉ chưa xem" và phân trang; tất cả ghi vào đường dẫn để trang máy chủ lọc. */
export function ReviewControls({ filter, unreviewedOnly, counts }: {
  filter: ReviewFilter;
  unreviewedOnly: boolean;
  counts: Record<ReviewFilter, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const go = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    next.delete("trang");
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={filter} onValueChange={(v) => go({ loc: v as string })}>
        {/* Ghi đè chiều cao cố định h-8 của TabsList gốc (biến thể group-data-horizontal), nếu không tab sẽ lòi khỏi khung. */}
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-[0_1px_2px_rgb(10_26_16/0.04)] group-data-horizontal/tabs:h-auto">
          {REVIEW_FILTERS.map((f) => {
            const Icon = FILTER_ICONS[f];
            return (
              <TabsTrigger
                key={f}
                value={f}
                className="h-8 flex-none gap-2 rounded-lg px-3 text-[13px] hover:bg-muted data-active:bg-primary-soft data-active:text-primary data-active:shadow-none data-active:ring-1 data-active:ring-primary/15 dark:data-active:border-transparent dark:data-active:bg-primary-soft"
              >
                <Icon className="size-3.5" />
                {REVIEW_FILTER_LABELS[f]}
                {counts[f] > 0 && f !== "tat-ca" && (
                  <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-warn/15 px-1.5 text-[11px] font-semibold tabular-nums text-warn">
                    {counts[f]}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted-foreground">
        {pending && <Spinner />}
        <Switch checked={unreviewedOnly} onCheckedChange={(on) => go({ xem: on ? null : "tat-ca" })} />
        Chỉ câu chưa xem
      </label>
    </div>
  );
}

export function ReviewList({ items }: { items: ReviewItem[] }) {
  const [pending, startTransition] = useTransition();
  const unreviewed = items.filter((i) => !i.reviewed).map((i) => i.id);
  const markAll = () => startTransition(() => setReviewed({ ids: unreviewed, reviewed: true }));

  if (!items.length) {
    return (
      <Empty className="rounded-2xl border border-dashed bg-card py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCheck />
          </EmptyMedia>
          <EmptyTitle>Không có câu nào cần xem</EmptyTitle>
          <EmptyDescription>Câu trả lời bị gắn cờ, bị từ chối hoặc bị học viên đánh giá không hữu ích sẽ hiện ở đây.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unreviewed.length > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{unreviewed.length}</span> câu chưa xem trên trang này
          </span>
          <Button variant="outline" size="sm" className="bg-card" onClick={markAll} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <CheckCheck data-icon="inline-start" />}
            Đánh dấu tất cả đã xem
          </Button>
        </div>
      )}
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </div>
  );
}

/** Nhãn nhỏ trong đầu thẻ. */
function Tag({ tone = "neutral", icon: Icon, children }: { tone?: "danger" | "warn" | "neutral" | "good"; icon?: typeof Flag; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "warn" && "bg-warn-soft text-warn ring-1 ring-warn/15",
        tone === "good" && "bg-primary-soft text-primary",
        tone === "neutral" && "border bg-background text-muted-foreground",
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toggle = () => startTransition(() => setReviewed({ ids: [item.id], reviewed: !item.reviewed }));
  const mode = item.mode && item.mode in MODES ? MODES[item.mode as ModeId].label : null;
  const negative = item.feedback && item.feedback.rating < 0;
  // Vạch màu bên trái: đỏ khi gắn cờ, vàng khi bị đánh giá thấp, xám khi chỉ bị từ chối hoặc đã xem.
  const stripe = item.reviewed ? "before:bg-border" : item.flagged ? "before:bg-destructive" : negative ? "before:bg-warn" : "before:bg-muted-foreground/30";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(10_26_16/0.04)] transition-opacity",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        stripe,
        item.reviewed && "opacity-65 hover:opacity-100",
      )}
    >
      <div className="flex flex-col gap-3 py-4 pr-5 pl-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.flagged && <Tag tone="danger" icon={Flag}>Gắn cờ</Tag>}
          {item.refused && <Tag icon={Ban}>Từ chối · {REFUSAL_LABELS[item.refused] ?? item.refused}</Tag>}
          {item.feedback && (
            <Tag tone={negative ? "warn" : "good"} icon={negative ? ThumbsDown : ThumbsUp}>
              {item.feedback.reason ?? (negative ? "Không hữu ích" : "Hữu ích")}
            </Tag>
          )}
          {mode && <Tag>{mode}</Tag>}
          {item.chapters.length > 0 && <Tag>Chương {item.chapters.join(", ")}</Tag>}
          {item.reviewed && <Tag tone="good" icon={Check}>Đã xem</Tag>}
          <time className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">{dateTime(item.createdAt)}</time>
        </div>

        <p className="text-[15px] font-medium leading-relaxed text-pretty">{item.question}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.student ? (
            <Link href={`/quan-tri/hoc-vien/${encodeURIComponent(item.student.code)}`} className="group inline-flex items-center gap-2 hover:text-foreground">
              <Initials name={item.student.name} className="size-6 text-[9.5px]" />
              <span className="font-medium text-foreground group-hover:text-primary">{item.student.name}</span>
              <span className="font-mono text-[11px]">{item.student.code}</span>
              <span>· Lớp {item.student.className}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed text-[10px]">?</span>
              Người dùng chưa đăng nhập
            </span>
          )}
          {item.maxScore !== null && (
            <span className="rounded bg-muted px-1.5 py-px font-mono text-[11px]" title="Điểm tìm kiếm cao nhất của các đoạn tài liệu">
              tìm kiếm {item.maxScore.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>

        {item.feedback?.comment && (
          <blockquote className="flex gap-2.5 rounded-xl border border-warn/15 bg-warn-soft px-3.5 py-2.5 text-sm">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-warn" />
            <span>
              <span className="font-medium">Góp ý của học viên: </span>
              {item.feedback.comment}
            </span>
          </blockquote>
        )}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent>
          <div className="border-t bg-subtle/50 py-4 pr-5 pl-6 text-sm">
            <Markdown>{item.answer || "_(Không có nội dung trả lời.)_"}</Markdown>
          </div>
        </CollapsibleContent>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t py-2 pr-3 pl-4">
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}>
            <ChevronDown data-icon="inline-start" className={cn("transition-transform", open && "rotate-180")} />
            {open ? "Ẩn câu trả lời" : "Xem câu trả lời của trợ lý"}
          </CollapsibleTrigger>
          <Button
            variant={item.reviewed ? "ghost" : "outline"}
            size="sm"
            className={cn(!item.reviewed && "text-primary hover:border-primary/40 hover:bg-primary-soft hover:text-primary")}
            onClick={toggle}
            disabled={pending}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : item.reviewed ? (
              <RotateCcw data-icon="inline-start" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {item.reviewed ? "Bỏ đánh dấu" : "Đánh dấu đã xem"}
          </Button>
        </div>
      </Collapsible>
    </article>
  );
}
