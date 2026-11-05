"use server";

import { getCurrentUser, isStudent } from "@/lib/auth/session";

import type { BadgeIcon, Tier } from "./catalog";
import { syncBadges } from "./server/badges";

export interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  icon: BadgeIcon;
  /** Số chương in trên huy chương chương học. */
  chapter?: number;
}

/** Xét huy hiệu sau khi học viên vừa học xong một việc; trả về huy hiệu mới mở khóa để báo ngay. */
export async function checkBadges(): Promise<UnlockedBadge[]> {
  const user = await getCurrentUser();
  if (!isStudent(user)) return [];
  const { fresh } = await syncBadges(user.visitorId);
  return fresh.map((b) => ({ id: b.id, name: b.name, description: b.description, tier: b.tier, icon: b.icon, chapter: b.chapter?.number }));
}
