import { PASS_RATIO } from "@/features/quiz/types";

// Logic thuần cho trang Hôm nay và trang Tiến độ, tách khỏi DB để kiểm thử được.

const DAY_MS = 86_400_000;

/** Ngày theo giờ Việt Nam, dạng yyyy-mm-dd. */
export const vnDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY_MS).toISOString().slice(0, 10);
const previousDay = (day: string) => shiftDay(day, -1);

/**
 * Số ngày học liên tiếp tính tới hôm nay. Hôm nay chưa học thì tính tới hôm qua,
 * để sáng sớm mở trang chưa thấy chuỗi bị về 0.
 */
export function studyStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let day = set.has(today) ? today : previousDay(today);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = previousDay(day);
  }
  return n;
}

/** Chuỗi dài nhất từng có trong các ngày đã cho. */
export function longestStreak(days: Iterable<string>): number {
  const set = new Set(days);
  let best = 0;
  for (const day of set) {
    if (set.has(previousDay(day))) continue; // chỉ đếm từ ngày đầu mỗi chuỗi
    let n = 1;
    while (set.has(shiftDay(day, n))) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Các mốc chuỗi ngày học để luôn có mục tiêu gần; vượt mốc cuối thì cứ thêm 100 ngày. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export function nextMilestone(streak: number): number {
  return STREAK_MILESTONES.find((m) => m > streak) ?? (Math.floor(streak / 100) + 1) * 100;
}

export interface StreakDay {
  day: string;
  /** Thứ trong tuần, 0 là Chủ nhật. */
  weekday: number;
  studied: boolean;
}

/** `n` ngày gần nhất tính tới hôm nay, cũ trước. */
export function recentDays(days: Iterable<string>, today: string, n = 7): StreakDay[] {
  const set = new Set(days);
  return Array.from({ length: n }, (_, i) => {
    const day = shiftDay(today, i - n + 1);
    return { day, weekday: new Date(`${day}T00:00:00Z`).getUTCDay(), studied: set.has(day) };
  });
}

/**
 * Chương nên làm trắc nghiệm tiếp: ưu tiên chương đã làm mà chưa đạt, sau đó tới chương chưa làm.
 * Chỉ xét chương có ngân hàng câu hỏi. Mọi chương đã đạt thì trả về undefined.
 */
export function pickNextChapter<C extends { number: number }>(
  chapters: C[],
  rows: { chapter: number; quizAttempts: number; quizBest: number | null }[],
  quizCounts: Record<number, number>,
): C | undefined {
  const row = (n: number) => rows.find((r) => r.chapter === n);
  const pending = chapters.filter((c) => quizCounts[c.number] && (row(c.number)?.quizBest ?? 0) < PASS_RATIO);
  return pending.find((c) => row(c.number)?.quizAttempts) ?? pending[0];
}
