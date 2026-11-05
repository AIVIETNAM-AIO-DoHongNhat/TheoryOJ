import { PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentGate } from "@/features/auth/components/StudentGate";
import { CATEGORIES, closestBadges, TIER_LABELS, type Tier } from "@/features/badges/catalog";
import { BadgeCard } from "@/features/badges/components/BadgeCard";
import { BadgeMedal } from "@/features/badges/components/BadgeMedal";
import { syncBadges } from "@/features/badges/server/badges";
import { getCurrentUser, isStudent } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Bộ sưu tập huy hiệu" };

const TIERS: Tier[] = ["vang", "bac", "dong"];

async function Collection() {
  const user = await getCurrentUser();
  if (!isStudent(user)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <StudentGate user={user} next="/huy-hieu" action="sưu tầm huy hiệu" />
      </div>
    );
  }
  await connection();
  const { badges, earned, total, fresh } = await syncBadges(user.visitorId);
  const now = new Date().getTime();
  const closest = closestBadges(badges);
  const byTier = Object.fromEntries(TIERS.map((t) => [t, badges.filter((b) => b.earned && b.tier === t).length])) as Record<Tier, number>;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:py-16">
      {fresh.length > 0 && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <PartyPopper className="size-5 shrink-0" />
          <span>
            Đồng chí vừa mở khóa <span className="font-semibold">{fresh.length} huy hiệu mới</span>: {fresh.map((b) => b.name).join(", ")}.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="justify-between gap-6 px-6 py-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Đã sưu tầm</span>
            <span className="font-heading text-5xl leading-none font-bold tabular-nums">
              {earned}
              <span className="text-2xl font-semibold text-muted-foreground">/{total}</span>
            </span>
          </div>
          <Progress value={total ? (earned / total) * 100 : 0} aria-label="Tỷ lệ huy hiệu đã sưu tầm" />
          <ul className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-2">
                <BadgeMedal icon="award" tier={t} earned size="sm" />
                <span className="flex flex-col leading-tight">
                  <span className="font-heading text-lg font-bold tabular-nums">{byTier[t]}</span>
                  <span className="text-xs text-muted-foreground">{TIER_LABELS[t]}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="gap-4 px-6 py-6">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sắp mở khóa</h2>
          {closest.length ? (
            <ul className="flex flex-col gap-4">
              {closest.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <BadgeMedal icon={b.icon} tier={b.tier} earned={false} chapter={b.chapter?.number} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{b.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        còn {b.target - b.current} {b.unit}
                      </span>
                    </div>
                    <Progress value={(b.current / b.target) * 100} aria-label={`Tiến độ huy hiệu ${b.name}`} />
                    <span className="truncate text-xs text-muted-foreground">{b.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Đồng chí đã sưu tầm đủ mọi huy hiệu. Xuất sắc!</p>
          )}
        </Card>
      </div>

      {CATEGORIES.map((cat) => {
        const list = badges.filter((b) => b.category === cat.id);
        if (!list.length) return null;
        return (
          <section key={cat.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
              <div className="flex max-w-3xl flex-col gap-1">
                <h2 className="text-2xl font-bold">{cat.title}</h2>
                <p className="text-sm text-muted-foreground">{cat.description}</p>
              </div>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                {list.filter((b) => b.earned).length}/{list.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => (
                <BadgeCard key={b.id} badge={b} now={now} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function BadgesPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Hôm nay", href: "/hoc" }, { label: "Bộ sưu tập" }]}
        title="Bộ sưu tập huy hiệu"
        lead="Mỗi chương đạt trắc nghiệm, mỗi mốc chuỗi ngày học, mỗi chặng ôn thẻ đều có một huy hiệu chờ đồng chí sưu tầm. Huy hiệu đã nhận được giữ mãi, kể cả khi chuỗi ngày học bị đứt."
      />
      <Suspense
        fallback={
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        }
      >
        <Collection />
      </Suspense>
    </>
  );
}
