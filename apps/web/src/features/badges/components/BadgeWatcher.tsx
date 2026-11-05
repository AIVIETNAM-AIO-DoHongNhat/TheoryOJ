"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { STUDIED_EVENT } from "@/features/progress/streak-event";

import { checkBadges, type UnlockedBadge } from "../actions";
import { TIER_LABELS } from "../catalog";
import { BadgeMedal } from "./BadgeMedal";

/** Chờ học viên ngừng tay một nhịp rồi mới xét, để một lượt ôn nhiều thẻ chỉ gọi máy chủ một lần. */
const SETTLE_MS = 1500;
const SHOW_MS = 9000;
/** Trang có hiện huy hiệu: vẽ lại khi có huy hiệu mới để khỏi thấy huy hiệu vừa đạt vẫn bị khóa. */
const SHOWS_BADGES = ["/huy-hieu", "/hoc"];

/**
 * Nghe sự kiện "vừa học xong" (nộp trắc nghiệm, bài tập, chấm thẻ), xét huy hiệu và báo huy hiệu mới mở khóa
 * bằng một thẻ nổi ở cuối màn hình. Đặt cạnh nút ngọn lửa ở đầu trang nên chỉ có với học viên đã đăng nhập.
 */
export function BadgeWatcher() {
  const [unlocked, setUnlocked] = useState<UnlockedBadge[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const onStudied = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const fresh = await checkBadges();
          if (!alive || !fresh.length) return;
          setUnlocked((u) => [...u, ...fresh.filter((f) => !u.some((x) => x.id === f.id))]);
          if (SHOWS_BADGES.includes(pathname)) router.refresh();
        } catch {
          // Không xét được thì thôi, lần học sau hoặc khi mở trang Huy hiệu sẽ xét lại.
        }
      }, SETTLE_MS);
    };
    window.addEventListener(STUDIED_EVENT, onStudied);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener(STUDIED_EVENT, onStudied);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!unlocked.length) return;
    const t = setTimeout(() => setUnlocked([]), SHOW_MS);
    return () => clearTimeout(t);
  }, [unlocked]);

  if (!unlocked.length) return null;
  // Đầu trang có backdrop-filter nên `fixed` bên trong bị neo theo đầu trang; đưa ra body để neo theo màn hình.
  return createPortal(<UnlockToast badges={unlocked} onClose={() => setUnlocked([])} />, document.body);
}

function UnlockToast({ badges, onClose }: { badges: UnlockedBadge[]; onClose: () => void }) {
  // Huy hiệu hạng cao nhất lên đầu, các huy hiệu khác gộp thành một dòng.
  const order = { vang: 0, bac: 1, dong: 2 };
  const [top, ...rest] = [...badges].sort((a, b) => order[a.tier] - order[b.tier]);

  return (
    <div
      role="status"
      aria-live="polite"
      // Màn hẹp hiện ngay dưới đầu trang để không đè cụm nút nổi ở góc dưới.
      className="fixed top-20 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 motion-safe:animate-rise sm:top-auto sm:bottom-8"
    >
      <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-popover p-4 pr-10 text-popover-foreground shadow-xl shadow-black/10">
        <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-100/60 via-transparent to-transparent dark:from-amber-500/10" />
        <BadgeMedal icon={top.icon} tier={top.tier} earned chapter={top.chapter} className="motion-safe:animate-medal-pop" />
        <div className="relative flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
            Mở khóa huy hiệu {TIER_LABELS[top.tier].toLowerCase()}
          </span>
          <span className="font-heading text-lg leading-tight font-bold">{top.name}</span>
          <span className="line-clamp-2 text-sm text-muted-foreground">{top.description}</span>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button size="sm" render={<Link href="/huy-hieu" onClick={onClose} />} nativeButton={false}>
              Xem bộ sưu tập
              <ArrowRight data-icon="inline-end" />
            </Button>
            {rest.length > 0 && <span className="text-xs text-muted-foreground">và {rest.length} huy hiệu khác</span>}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" aria-label="Đóng" onClick={onClose}>
          <X />
        </Button>
      </div>
    </div>
  );
}
