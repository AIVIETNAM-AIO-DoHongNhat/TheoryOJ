import { Award } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { closestBadges } from "../catalog";
import type { BadgeCollection } from "../server/badges";
import { BadgeMedal } from "./BadgeMedal";

/** Thẻ huy hiệu ở trang Hôm nay: số đã sưu tầm, mấy huy hiệu mới nhất và huy hiệu sắp đạt. */
export function BadgeSummary({ collection: { badges, earned, total } }: { collection: BadgeCollection }) {
  const latest = badges
    .filter((b) => b.earnedAt)
    .sort((a, b) => b.earnedAt!.getTime() - a.earnedAt!.getTime())
    .slice(0, 5);
  const [next] = closestBadges(badges, 1);

  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Award className="size-4 text-amber-500" />
          Huy hiệu
        </CardDescription>
        <CardTitle className="font-heading text-2xl tabular-nums">
          {earned}
          <span className="text-base font-semibold text-muted-foreground">/{total} đã sưu tầm</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {latest.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Huy hiệu mới nhất">
            {latest.map((b) => (
              <li key={b.id} title={b.name}>
                <BadgeMedal icon={b.icon} tier={b.tier} earned chapter={b.chapter?.number} size="sm" />
                <span className="sr-only">{b.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có huy hiệu nào. Đạt trắc nghiệm một chương hoặc học ba ngày liền để nhận huy hiệu đầu tiên.</p>
        )}
        {next && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium">Sắp đạt: {next.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {next.current}/{next.target}
              </span>
            </div>
            <Progress value={(next.current / next.target) * 100} aria-label={`Tiến độ huy hiệu ${next.name}`} />
          </div>
        )}
        <Link href="/huy-hieu" className="text-sm font-medium text-primary hover:underline">
          Xem bộ sưu tập →
        </Link>
      </CardContent>
    </Card>
  );
}
