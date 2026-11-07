"use client";

import { Check, Hand, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState, useTransition } from "react";

import { MinhMascot } from "@/components/brand/MinhMascot";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Màn chuyển cảnh giữa lúc đăng nhập (đăng ký) xong và lúc vào trang học, hoặc giữa lúc bấm đăng xuất và lúc về trang chủ:
 * lớp phủ loang tròn từ chỗ vừa bấm, Minh chào mừng hoặc vẫy tay tạm biệt, gọi tên học viên, các bước đang làm lần lượt
 * được đánh dấu xong, thanh chờ đầy dần.
 *
 * Lớp phủ gắn một lần ở layout gốc (AuthTransitionHost), không nằm trong form hay menu tài khoản: khi cookie phiên đổi,
 * Next dựng lại trang hiện tại nên form đăng nhập, menu tài khoản có thể biến mất giữa chừng, còn lớp phủ thì vẫn ở đó.
 * Lớp phủ tự chuyển trang và chỉ tắt khi trang đích đã hiện, nên người dùng không thấy trang cũ nháy lại ở trạng thái mới.
 * Nền lớp phủ đặc (không trong suốt) cũng vì lý do đó.
 */

type Kind = "login" | "register" | "logout";

interface Run {
  kind: Kind;
  /** Họ tên đầy đủ; trống thì lời chào bỏ phần tên. */
  fullName?: string;
  /** Đường dẫn chuyển tới khi xong. */
  to: string;
  /** Việc chạy song song với lời chào (đăng xuất: gọi Server Action). Lỗi thì tắt lớp phủ, ở lại trang. */
  work?: () => Promise<unknown>;
}

/** Thời gian hiện tối thiểu, đủ để đọc lời chào; trang đích tải lâu hơn thì lớp phủ chờ theo. */
const MIN_MS: Record<Kind, number> = { login: 1500, register: 2000, logout: 1400 };
const LEAVE_MS = 450;
/** Chuyển trang sau lời chào lâu hơn mốc này thì tải hẳn trang đích (xem chốt dự phòng trong AuthTransitionHost). */
const NAV_TIMEOUT_MS = 8000;
/** Cú bấm gần đây hơn mốc này mới dùng làm tâm loang (đăng nhập phải chờ Server Action nên có độ trễ). */
const ORIGIN_FRESH_MS = 8000;

let start: ((run: Run) => void) | null = null;

/** Mở màn chuyển cảnh. Lớp phủ chưa gắn (hiếm gặp) thì làm việc cần làm rồi tải lại trang đích. */
export function playAuthTransition(run: Run): void {
  if (start) return start(run);
  void Promise.resolve(run.work?.()).then(() => window.location.assign(run.to));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tên gọi: từ cuối trong họ tên tiếng Việt. */
function givenName(fullName?: string): string {
  return fullName?.trim().split(/\s+/).at(-1) ?? "";
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 13) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function copyFor(run: Run, done: boolean): { eyebrow: string; title: string; lead: string } {
  const name = givenName(run.fullName);
  const dc = name ? `đồng chí ${name}` : "đồng chí";
  switch (run.kind) {
    case "login":
      return {
        eyebrow: timeGreeting(),
        title: `Mừng ${dc} trở lại!`,
        lead: run.to.startsWith("/quan-tri") ? "Đang mở trang quản trị…" : "Đang mở góc học tập của đồng chí…",
      };
    case "register":
      return {
        eyebrow: "Đăng ký thành công",
        title: `Chào mừng ${dc}!`,
        lead: "Tài khoản đã sẵn sàng. Cùng Minh bắt đầu buổi học đầu tiên nhé.",
      };
    case "logout":
      return {
        eyebrow: done ? "Đã đăng xuất" : "Đang đăng xuất…",
        title: `Hẹn gặp lại ${dc}!`,
        lead: "Tiến độ học tập đã được lưu. Chúc đồng chí một ngày tốt lành.",
      };
  }
}

/**
 * Các bước hiện dưới lời chào. `at`: phần thời gian tối thiểu (MIN_MS) trôi qua thì bước được đánh dấu xong; null thì bước
 * chỉ xong theo pha thật (đăng xuất xong khi Server Action trả về, bước cuối xong khi trang đích đã hiện).
 */
function stepsFor(run: Run): { label: string; at: number | null }[] {
  const admin = run.to.startsWith("/quan-tri");
  switch (run.kind) {
    case "login":
      return [
        { label: "Xác thực", at: 0 },
        { label: "Đồng bộ tiến độ", at: 0.45 },
        { label: admin ? "Mở trang quản trị" : "Mở trang học", at: null },
      ];
    case "register":
      return [
        { label: "Tạo tài khoản", at: 0 },
        { label: "Lưu tiến độ đã học", at: 0.4 },
        { label: "Mở trang học", at: null },
      ];
    case "logout":
      return [
        { label: "Lưu tiến độ", at: 0.35 },
        { label: "Kết thúc phiên", at: null },
        { label: "Về trang chủ", at: null },
      ];
  }
}

/** Tia lấp lánh quanh linh vật: góc (độ), khoảng bắn ra (px), cỡ (px), độ trễ (ms). */
const SPARKS = [
  { a: -90, r: 118, s: 10, d: 380 },
  { a: -50, r: 104, s: 7, d: 440 },
  { a: -15, r: 126, s: 9, d: 400 },
  { a: 25, r: 108, s: 6, d: 470 },
  { a: 60, r: 120, s: 8, d: 420 },
  { a: 120, r: 112, s: 7, d: 450 },
  { a: 160, r: 124, s: 9, d: 390 },
  { a: 200, r: 106, s: 6, d: 480 },
  { a: 235, r: 120, s: 8, d: 410 },
];

type Phase = "work" | "nav" | "leave";
type Origin = { x: number; y: number };

export function AuthTransitionHost() {
  const router = useRouter();
  const [run, setRun] = useState<(Run & { id: number; origin: Origin | null; minMs: number }) | null>(null);
  const [phase, setPhase] = useState<Phase>("work");
  const [elapsed, setElapsed] = useState(0);
  const [navigating, startNav] = useTransition();
  const seq = useRef(0);
  const lastPointer = useRef<(Origin & { t: number }) | null>(null);

  // Nhớ cú bấm gần nhất (nút đăng nhập, mục đăng xuất) để lớp phủ loang ra từ đúng chỗ đó.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);

  useEffect(() => {
    start = (r) => {
      const id = ++seq.current;
      const p = lastPointer.current;
      const origin = p && performance.now() - p.t < ORIGIN_FRESH_MS ? { x: p.x, y: p.y } : null;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const minMs = reduced ? 500 : MIN_MS[r.kind];
      setRun({ ...r, id, origin, minMs });
      setPhase("work");
      setElapsed(0);
      router.prefetch(r.to);
      Promise.all([r.work?.(), wait(minMs)]).then(
        () => {
          if (seq.current !== id) return;
          setPhase("nav");
          startNav(() => router.replace(r.to));
        },
        () => {
          if (seq.current === id) setPhase("leave");
        },
      );
    };
    return () => {
      start = null;
    };
  }, [router]);

  // Đồng hồ cho các bước có mốc thời gian (`at`); chỉ cần vài nhịp nên đặt hẹn giờ theo từng mốc.
  useEffect(() => {
    if (!run) return;
    const marks = stepsFor(run).flatMap((s) => (s.at ? [s.at] : []));
    const timers = marks.map((m) => setTimeout(() => setElapsed((e) => Math.max(e, m)), m * run.minMs));
    return () => timers.forEach(clearTimeout);
  }, [run]);

  // Lỗi khi làm việc, hoặc trang đích đã hiện (chuyển trang trong transition xong): mờ dần lớp phủ rồi gỡ hẳn.
  const leaving = phase === "leave" || (phase === "nav" && !navigating);

  // Chốt dự phòng: chuyển trang phía client mãi chưa xong (máy chủ đang bận, đang biên dịch lại khi phát triển, mạng chập
  // chờn) thì tải hẳn trang đích, để người dùng không phải tự bấm tải lại khi lớp phủ cứ quay. Phiên đã ghi vào cookie nên
  // tải lại vẫn vào đúng trang của mình.
  const stuckTarget = phase === "nav" && navigating ? run?.to : undefined;
  useEffect(() => {
    if (!stuckTarget) return;
    const t = setTimeout(() => window.location.assign(stuckTarget), NAV_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [stuckTarget]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setRun(null), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving, run?.id]);

  if (!run) return null;
  const { eyebrow, title, lead } = copyFor(run, phase !== "work");
  const bye = run.kind === "logout";
  const steps = stepsFor(run);
  // Bước chưa có mốc giờ: bước đầu tiên loại này xong khi hết pha chờ việc, bước cuối xong khi rời lớp phủ.
  const nullSteps = steps.filter((s) => s.at === null);
  const isDone = (s: (typeof steps)[number]) => {
    if (s.at !== null) return elapsed >= s.at || phase !== "work";
    const i = nullSteps.indexOf(s);
    if (i === nullSteps.length - 1) return leaving;
    return phase !== "work";
  };
  const activeIndex = steps.findIndex((s) => !isDone(s));

  return (
    <div
      key={run.id}
      role="status"
      aria-live="polite"
      style={
        {
          "--ox": run.origin ? `${run.origin.x}px` : "50%",
          "--oy": run.origin ? `${run.origin.y}px` : "50%",
          "--fill-ms": `${run.minMs}ms`,
        } as CSSProperties
      }
      className={cn(
        // Rời đi chậm hơn mặc định một chút để trang đích hiện ra êm.
        "fixed inset-0 z-100 grid place-items-center overflow-hidden bg-background px-6 transition-opacity duration-450 ease-out",
        "animate-curtain-in",
        leaving && "pointer-events-none opacity-0",
      )}
    >
      {/* Nền: lưới mảnh, các vệt màu loang trôi chậm, quầng sáng sau linh vật. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-lines-light" />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-32 -top-32 size-120 rounded-full blur-3xl motion-safe:animate-drift",
          bye ? "bg-amber-300/20" : "bg-primary/15",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 size-136 rounded-full bg-mint/25 blur-3xl motion-safe:animate-drift dark:bg-mint/10"
        style={{ animationDirection: "alternate-reverse" }}
      />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-112 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div
        className={cn(
          "relative flex max-w-md flex-col items-center text-center transition-[transform,opacity] duration-450 ease-out",
          leaving && "-translate-y-3 scale-[1.03] opacity-0",
        )}
      >
        <div className="relative mb-7">
          {/* Quỹ đạo nét đứt quay chậm, có ba chấm sáng chạy theo. */}
          <div aria-hidden className="anim-delay-300 absolute -inset-7 animate-fade-in">
            <div className="size-full rounded-full border border-dashed border-primary/25 motion-safe:animate-[spin_16s_linear_infinite]">
              <span className="absolute left-1/2 -top-1 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60" />
              <span className="absolute -bottom-0.5 left-[15%] size-1.5 rounded-full bg-mint" />
              <span className={cn("absolute right-[6%] top-[22%] size-1.5 rounded-full", bye ? "bg-amber-400" : "bg-primary/60")} />
            </div>
          </div>

          {/* Tia lấp lánh bắn ra một lần khi linh vật vừa bật lên. */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
            {SPARKS.map((s, i) => {
              const rad = (s.a * Math.PI) / 180;
              // Đăng xuất: tia bay lên chậm như bong bóng thay vì bắn tỏa.
              const dx = bye ? Math.cos(rad) * s.r * 0.6 : Math.cos(rad) * s.r;
              const dy = bye ? -Math.abs(Math.sin(rad) * s.r) - 30 : Math.sin(rad) * s.r;
              return (
                <span
                  key={i}
                  className={cn(
                    "absolute -translate-1/2 rounded-full animate-spark",
                    i % 3 === 0 ? (bye ? "bg-amber-400" : "bg-primary") : i % 3 === 1 ? "bg-mint" : bye ? "bg-amber-200" : "bg-lime-300",
                  )}
                  style={
                    {
                      width: s.s,
                      height: s.s,
                      animationDelay: `${s.d}ms`,
                      animationDuration: bye ? "1.8s" : undefined,
                      "--dx": `${dx}px`,
                      "--dy": `${dy}px`,
                    } as CSSProperties
                  }
                />
              );
            })}
            {!bye && (
              <Sparkles className="anim-delay-600 absolute -left-24 -top-20 size-5 text-primary/70 animate-pop-in" />
            )}
          </div>

          <div className="relative animate-medal-pop anim-delay-200">
            <span aria-hidden className="absolute inset-3 rounded-full bg-primary/25 motion-safe:animate-halo" />
            <div className="motion-safe:animate-float">
              <MinhMascot className="relative size-32 sm:size-36" />
            </div>
            <span
              aria-hidden
              className={cn(
                "anim-delay-650 absolute -right-1 bottom-4 grid size-11 place-items-center rounded-full shadow-lg ring-4 ring-background animate-pop-in",
                bye ? "bg-amber-400 text-amber-950" : "bg-primary text-primary-foreground",
              )}
            >
              {bye ? <Hand className="size-5.5 origin-[70%_90%] motion-safe:animate-wave" /> : <Check className="size-6" strokeWidth={3} />}
            </span>
          </div>
        </div>

        <p className="animate-rise anim-delay-350 text-sm font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        <h2 className="animate-rise anim-delay-420 mt-2 font-heading text-3xl font-bold leading-tight text-foreground text-balance sm:text-4xl">
          {title}
        </h2>
        <p className="animate-rise anim-delay-500 mt-3 text-[15px] text-muted-foreground text-pretty">{lead}</p>

        {/* Các bước: xong thì hiện dấu tích, đang làm thì hiện vòng quay. */}
        <ol className="mt-7 flex flex-wrap justify-center gap-2">
          {steps.map((s, i) => {
            const done = isDone(s);
            const active = i === activeIndex;
            return (
              <li
                key={s.label}
                className={cn(
                  "animate-rise flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-300",
                  done
                    ? "border-primary/25 bg-primary-soft text-primary"
                    : active
                      ? "border-border bg-card text-foreground shadow-sm"
                      : "border-border/70 bg-card/60 text-muted-foreground",
                )}
                style={{ animationDelay: `${580 + i * 70}ms` }}
              >
                <span className="grid size-4 place-items-center">
                  {done ? (
                    <Check className="size-3.5 animate-pop-in" style={{ animationDuration: "300ms" }} strokeWidth={3} />
                  ) : active ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current opacity-50" />
                  )}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>

        {/* Thanh chờ: đầy dần trong thời gian tối thiểu, chạy nốt khi đã chuyển sang trang đích. */}
        <div aria-hidden className="animate-fade-in anim-delay-600 mt-6 h-1 w-52 overflow-hidden rounded-full bg-primary/15">
          <div
            key={phase === "work" ? "fill" : "finish"}
            className={cn(
              "h-full w-full origin-left rounded-full bg-linear-to-r from-primary to-primary-bright",
              phase === "work" ? "animate-bar-fill" : "animate-bar-finish",
            )}
          />
        </div>
      </div>
    </div>
  );
}
