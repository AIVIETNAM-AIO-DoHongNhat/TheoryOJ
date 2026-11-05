"use client";

import { Check, ChevronDown, Flag, RotateCcw, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODES, type ModeId } from "@/features/chat/modes";
import { cn } from "@/lib/utils";

import { setReviewed } from "../actions";
import { REFUSAL_LABELS, REVIEW_FILTER_LABELS, REVIEW_FILTERS, type ReviewFilter, type ReviewItem } from "../types";
import { dateTime } from "./AdminHeading";

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
        <TabsList className="h-auto flex-wrap">
          {REVIEW_FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>
              {REVIEW_FILTER_LABELS[f]}
              {counts[f] > 0 && f !== "tat-ca" && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 tabular-nums">{counts[f]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <label className="flex items-center gap-2 text-sm">
        {pending && <Spinner />}
        <Switch checked={unreviewedOnly} onCheckedChange={(on) => go({ xem: on ? null : "tat-ca" })} />
        Chỉ hiện câu chưa xem
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
      <Empty className="border bg-card py-16">
        <EmptyHeader>
          <EmptyTitle>Không có câu nào cần xem</EmptyTitle>
          <EmptyDescription>Câu trả lời bị gắn cờ, bị từ chối hoặc bị học viên đánh giá 👎 sẽ hiện ở đây.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unreviewed.length > 1 && (
        <Button variant="outline" className="self-end bg-card" onClick={markAll} disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
          Đánh dấu {unreviewed.length} câu trên trang là đã xem
        </Button>
      )}
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toggle = () => startTransition(() => setReviewed({ ids: [item.id], reviewed: !item.reviewed }));
  const mode = item.mode && item.mode in MODES ? MODES[item.mode as ModeId].label : null;

  return (
    <Card size="sm" className={cn(item.reviewed && "opacity-70", item.flagged && !item.reviewed && "ring-destructive/30")}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {item.flagged && (
            <Badge variant="destructive">
              <Flag data-icon="inline-start" />
              Gắn cờ
            </Badge>
          )}
          {item.refused && <Badge variant="outline">Từ chối: {REFUSAL_LABELS[item.refused] ?? item.refused}</Badge>}
          {item.feedback && (
            <Badge variant={item.feedback.rating < 0 ? "destructive" : "secondary"}>
              {item.feedback.rating < 0 ? <ThumbsDown data-icon="inline-start" /> : <ThumbsUp data-icon="inline-start" />}
              {item.feedback.reason ?? (item.feedback.rating < 0 ? "Không hữu ích" : "Hữu ích")}
            </Badge>
          )}
          {mode && <Badge variant="outline">{mode}</Badge>}
          {item.chapters.length > 0 && <Badge variant="outline">Chương {item.chapters.join(", ")}</Badge>}
          <span className="ml-auto">{dateTime(item.createdAt)}</span>
        </div>
        <p className="text-[15px] font-medium leading-snug">{item.question}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="size-3.5" />
          {item.student ? (
            <Link href={`/quan-tri/hoc-vien/${encodeURIComponent(item.student.code)}`} className="hover:text-primary hover:underline">
              {item.student.name} · {item.student.code} · Lớp {item.student.className}
            </Link>
          ) : (
            "Người dùng chưa đăng nhập"
          )}
          {item.maxScore !== null && <span>· Điểm tìm kiếm {item.maxScore.toFixed(2).replace(".", ",")}</span>}
        </p>
        {item.feedback?.comment && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm">
            <span className="font-medium">Góp ý của học viên: </span>
            {item.feedback.comment}
          </p>
        )}
      </CardHeader>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent>
          <CardContent className="border-t pt-3 text-sm">
            <Markdown>{item.answer || "_(Không có nội dung trả lời.)_"}</Markdown>
          </CardContent>
        </CollapsibleContent>
        <CardFooter className="flex flex-wrap justify-between gap-2">
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
            <ChevronDown data-icon="inline-start" className={cn("transition-transform", open && "rotate-180")} />
            {open ? "Ẩn câu trả lời" : "Xem câu trả lời của trợ lý"}
          </CollapsibleTrigger>
          <Button variant={item.reviewed ? "ghost" : "outline"} size="sm" onClick={toggle} disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : item.reviewed ? (
              <RotateCcw data-icon="inline-start" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {item.reviewed ? "Bỏ đánh dấu đã xem" : "Đánh dấu đã xem"}
          </Button>
        </CardFooter>
      </Collapsible>
    </Card>
  );
}
