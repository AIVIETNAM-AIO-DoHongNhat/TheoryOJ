"use client";

import { ArrowLeft, BookOpen, CalendarClock, PartyPopper, RotateCcw, Sigma, Lightbulb, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { markStudied } from "@/features/progress/streak-event";
import { reviewHref } from "@/features/review/paths";
import { cn } from "@/lib/utils";

import { reviewCard } from "../actions";
import { type CardState, formatInterval, type Grade, GRADE_LABELS, GRADES, schedule } from "../schedule";
import type { CardStateDTO, Flashcard } from "../types";

interface TextbookRef {
  href: string;
  /** Trang in đổi sang trang PDF bằng pageOffset. */
  pageOffset: number;
}

export interface FlashcardSessionProps {
  subject: string;
  chapter: number;
  cards: Flashcard[];
  /** Mã thẻ theo thứ tự ôn của lượt này (thẻ đến hạn trước, thẻ mới sau). */
  queue: string[];
  states: Record<string, CardStateDTO>;
  textbook: TextbookRef | null;
  /** Thẻ mới còn lại sau lượt này, để mời ôn tiếp. */
  remainingNew: number;
  /** Lần ôn gần nhất sắp tới khi không có thẻ nào đến hạn. */
  nextDue: string | null;
}

const GRADE_STYLE: Record<Grade, string> = {
  quen: "border-destructive/30 text-destructive hover:bg-destructive/5",
  kho: "border-warn/40 text-warn hover:bg-warn-soft",
  nho: "border-primary/30 text-primary hover:bg-primary-soft",
  de: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
};

const toState = (s: CardStateDTO | undefined): CardState | null => (s ? { ...s, dueAt: new Date(s.dueAt) } : null);

/**
 * Một lượt ôn thẻ: xem mặt trước, tự nhớ lại, lật thẻ, tự chấm. Thẻ bấm "Quên" quay lại cuối lượt.
 * Phím tắt: cách hoặc Enter để lật, 1–4 để chấm.
 */
export function FlashcardSession(props: FlashcardSessionProps) {
  const router = useRouter();
  const byId = useMemo(() => new Map(props.cards.map((c) => [c.id, c])), [props.cards]);
  const [queue, setQueue] = useState(props.queue);
  const [states, setStates] = useState(props.states);
  /** Mặt đang hiện; `revealed`: đã xem mặt sau ít nhất một lần, được chấm. */
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<Record<Grade, number>>({ quen: 0, kho: 0, nho: 0, de: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reviewed = GRADES.reduce((n, g) => n + done[g], 0);
  const total = reviewed + queue.length;
  const current = queue[0] ? byId.get(queue[0]) : undefined;

  const grade = useCallback(
    (g: Grade) => {
      if (!current || pending) return;
      setError(null);
      startTransition(async () => {
        try {
          const next = await reviewCard({ subject: props.subject, chapter: props.chapter, cardId: current.id, grade: g });
          setStates((s) => ({ ...s, [current.id]: next }));
          markStudied();
          setDone((d) => ({ ...d, [g]: d[g] + 1 }));
          setQueue((q) => (g === "quen" ? [...q.slice(1), q[0]] : q.slice(1)));
          setFlipped(false);
          setRevealed(false);
        } catch {
          setError("Chưa lưu được kết quả. Đồng chí thử lại sau ít phút.");
        }
      });
    },
    [current, pending, props.subject, props.chapter],
  );

  const flip = useCallback(() => {
    setFlipped((f) => !f);
    setRevealed(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable], button, a")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        grade(GRADES[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, flip, grade]);

  if (!current) {
    return <Finished {...props} done={done} reviewed={reviewed} onMore={() => router.replace(`?luot=${Date.now()}`, { scroll: false })} />;
  }

  const now = new Date();
  const prev = toState(states[current.id]);
  const pageHref = current.own
    ? current.sourceSlug && `/thu-vien/${current.sourceSlug}${current.pdfPage ? `?trang=${current.pdfPage}` : ""}`
    : current.page && props.textbook ? `${props.textbook.href}?trang=${current.page - props.textbook.pageOffset}` : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="shrink-0 tabular-nums">
          Thẻ {Math.min(reviewed + 1, total)}/{total}
        </span>
        <Progress value={(reviewed / Math.max(total, 1)) * 100} className="flex-1" aria-label="Tiến độ lượt ôn" />
        <span className="shrink-0">{prev ? "Ôn lại" : "Thẻ mới"}</span>
      </div>

      {/* Thẻ lật 3D: hai mặt chồng trong cùng một ô lưới nên thẻ cao theo mặt dài hơn. Thẻ mới dựng lại từ mặt trước, không chạy hiệu ứng. */}
      <div key={`${current.id}-${reviewed}`} className="perspective-[1400px]">
        <div
          role="button"
          tabIndex={-1}
          aria-label={flipped ? "Lật về mặt trước" : "Lật thẻ xem mặt sau"}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("a")) flip();
          }}
          className={cn(
            "grid cursor-pointer select-none transition-transform duration-500 ease-out transform-3d motion-reduce:transition-none",
            flipped && "rotate-y-180",
          )}
        >
          <Card
            aria-hidden={flipped}
            inert={flipped}
            className="min-h-80 justify-between border-t-4 border-t-primary shadow-lg shadow-forest/10 backface-hidden [grid-area:1/1]"
          >
            <CardHeader>
              {current.own ? (
                <Badge variant="secondary" className="self-start">
                  <UserRound data-icon="inline-start" />
                  Thẻ của tôi
                </Badge>
              ) : (
                <Badge variant="outline" className="self-start">
                  {current.kind === "cong_thuc" ? <Sigma data-icon="inline-start" /> : <Lightbulb data-icon="inline-start" />}
                  {current.kind === "cong_thuc" ? "Công thức" : "Khái niệm"}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center py-6 text-center">
              <CardTitle className="font-heading text-3xl leading-snug text-balance sm:text-4xl">{current.front}</CardTitle>
            </CardContent>
            <CardFooter className="justify-center text-sm text-muted-foreground">
              <RotateCcw className="mr-1.5 size-4" />
              Tự nhớ lại, rồi bấm vào thẻ để lật
            </CardFooter>
          </Card>

          <Card
            aria-hidden={!flipped}
            inert={!flipped}
            className="min-h-80 rotate-y-180 justify-between bg-primary-soft shadow-lg shadow-forest/10 ring-primary/25 backface-hidden [grid-area:1/1]"
          >
            <CardHeader className="gap-1">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Mặt sau</CardDescription>
              <CardTitle className="font-heading text-xl leading-snug">{current.front}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-[15px] leading-relaxed">
              <Markdown>{current.back}</Markdown>
              {pageHref && (
                <Button variant="link" className="self-start px-0" render={<Link href={pageHref} target="_blank" />} nativeButton={false}>
                  <BookOpen data-icon="inline-start" />
                  {current.own ? "Mở chỗ đã bôi đen" : `Giáo trình, tr. ${current.page}`}
                </Button>
              )}
            </CardContent>
            <CardFooter className="justify-center text-sm text-muted-foreground">
              <RotateCcw className="mr-1.5 size-4" />
              Bấm vào thẻ để xem lại mặt trước
            </CardFooter>
          </Card>
        </div>
      </div>

      {!revealed ? (
        <Button size="lg" className="h-12 text-base" onClick={flip}>
          <RotateCcw data-icon="inline-start" />
          Lật thẻ
          <Kbd className="ml-1 hidden bg-primary-foreground/20 text-primary-foreground sm:inline-flex">Cách</Kbd>
        </Button>
      ) : (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-1">
          <p className="text-center text-sm text-muted-foreground">Đồng chí nhớ thẻ này đến mức nào?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g, i) => (
              <Button
                key={g}
                variant="outline"
                disabled={pending}
                onClick={() => grade(g)}
                className={cn("h-auto flex-col gap-0.5 bg-card py-2.5", GRADE_STYLE[g])}
              >
                <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                  {GRADE_LABELS[g]}
                  <Kbd className="hidden h-4 min-w-4 bg-current/10 text-[10px] text-current sm:inline-flex">{i + 1}</Kbd>
                </span>
                <span className="text-xs font-normal opacity-80">{formatInterval(schedule(prev, g, now), now)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Finished({
  subject,
  chapter,
  remainingNew,
  nextDue,
  done,
  reviewed,
  onMore,
}: FlashcardSessionProps & { done: Record<Grade, number>; reviewed: number; onMore: () => void }) {
  const router = useRouter();
  // Ôn xong thì tải lại số liệu ở đầu trang (thẻ mới, đến hạn, đã thuộc); lượt ôn giữ nguyên vì key theo ?luot=.
  useEffect(() => {
    if (reviewed) router.refresh();
  }, [reviewed, router]);
  const next = nextDue ? new Date(nextDue) : null;
  return (
    <Card className="mx-auto w-full max-w-xl text-center">
      <CardHeader className="justify-items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          {reviewed ? <PartyPopper className="size-7" /> : <CalendarClock className="size-7" />}
        </span>
        <CardTitle className="font-heading text-2xl">{reviewed ? "Hoàn thành lượt ôn" : "Chưa có thẻ đến hạn"}</CardTitle>
        <CardDescription className="text-balance">
          {reviewed
            ? `Đồng chí đã ôn ${reviewed} lượt thẻ. Thẻ nhớ tốt sẽ được hẹn ôn lại thưa dần.`
            : next
              ? `Lần ôn tới: ${next.toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" })}.`
              : "Chương này đã ôn hết thẻ."}
        </CardDescription>
      </CardHeader>
      {reviewed > 0 && (
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <div key={g} className="rounded-xl border bg-subtle px-2 py-3">
                <div className="font-heading text-2xl font-bold tabular-nums">{done[g]}</div>
                <div className="text-xs text-muted-foreground">{GRADE_LABELS[g]}</div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      <CardFooter className="flex flex-wrap justify-center gap-2">
        {remainingNew > 0 && <Button onClick={onMore}>Học thêm {remainingNew} thẻ mới</Button>}
        <Button variant="outline" render={<Link href={reviewHref(subject, chapter)} />} nativeButton={false}>
          <ArrowLeft data-icon="inline-start" />
          Về chương {chapter}
        </Button>
        <Button variant="outline" render={<Link href="/tien-do" />} nativeButton={false}>
          Xem tiến độ
        </Button>
      </CardFooter>
    </Card>
  );
}
