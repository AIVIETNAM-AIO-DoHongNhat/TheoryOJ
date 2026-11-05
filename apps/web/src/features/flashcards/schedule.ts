/**
 * Lịch ôn thẻ ghi nhớ theo kiểu lặp lại ngắt quãng (giản lược từ SM-2). File thuần, dùng chung cho máy chủ
 * (tính lịch thật khi lưu) và trình duyệt (hiện trước khoảng cách trên nút chấm).
 */

export const GRADES = ["quen", "kho", "nho", "de"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = { quen: "Quên", kho: "Khó", nho: "Nhớ", de: "Dễ" };

/** Số thẻ mới tối đa mỗi lượt ôn, để lượt đầu không quá dài. */
export const NEW_PER_SESSION = 20;
/** Khoảng ôn từ mức này trở lên thì coi là đã thuộc. */
export const MASTERED_DAYS = 21;
/** Thẻ bấm "Quên" được hỏi lại sau khoảng này (và hiện lại ngay cuối lượt ôn). */
const RELEARN_MINUTES = 10;
const MIN_EASE = 1.3;

export interface CardState {
  ease: number;
  /** Khoảng ôn hiện tại, tính bằng ngày; 0 là đang học lại. */
  intervalDays: number;
  /** Số lần nhớ liên tiếp. */
  reps: number;
  lapses: number;
  reviews: number;
  dueAt: Date;
}

export const NEW_STATE: Omit<CardState, "dueAt"> = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, reviews: 0 };

const DAY = 86_400_000;

/** Trạng thái mới sau khi chấm một thẻ. `prev` null là thẻ chưa ôn lần nào. */
export function schedule(prev: CardState | null, grade: Grade, now: Date): CardState {
  const s = prev ?? { ...NEW_STATE, dueAt: now };
  const reviews = s.reviews + 1;

  if (grade === "quen") {
    return {
      ease: Math.max(MIN_EASE, s.ease - 0.2),
      intervalDays: 0,
      reps: 0,
      lapses: s.reps > 0 ? s.lapses + 1 : s.lapses,
      reviews,
      dueAt: new Date(now.getTime() + RELEARN_MINUTES * 60_000),
    };
  }

  let interval: number;
  let ease = s.ease;
  if (grade === "kho") {
    interval = s.reps === 0 ? 1 : Math.max(s.intervalDays + 1, Math.round(s.intervalDays * 1.2));
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else if (grade === "nho") {
    interval = s.reps === 0 ? 2 : s.reps === 1 ? 4 : Math.max(s.intervalDays + 1, Math.round(s.intervalDays * ease));
  } else {
    interval = s.reps === 0 ? 5 : Math.max(s.intervalDays + 2, Math.round(s.intervalDays * ease * 1.3));
    ease += 0.15;
  }
  return { ease, intervalDays: interval, reps: s.reps + 1, lapses: s.lapses, reviews, dueAt: new Date(now.getTime() + interval * DAY) };
}

/** Khoảng cách tới lần ôn sau, viết gọn cho nút chấm: "10 phút", "1 ngày", "3 tháng". */
export function formatInterval(state: CardState, now: Date): string {
  const ms = state.dueAt.getTime() - now.getTime();
  if (ms < DAY) return `${Math.max(1, Math.round(ms / 60_000))} phút`;
  const days = Math.round(ms / DAY);
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${Math.round((days / 365) * 10) / 10} năm`.replace(".", ",");
}

export type CardStatus = "moi" | "den-han" | "dang-hoc" | "da-thuoc";

export function cardStatus(state: CardState | undefined, now: Date): CardStatus {
  if (!state) return "moi";
  if (state.dueAt <= now) return "den-han";
  return state.intervalDays >= MASTERED_DAYS ? "da-thuoc" : "dang-hoc";
}

/** Thứ tự thẻ cho một lượt ôn: thẻ đến hạn (quá hạn lâu nhất trước), sau đó thẻ mới theo thứ tự trong file. */
export function buildQueue(cardIds: string[], states: ReadonlyMap<string, CardState>, now: Date, newLimit = NEW_PER_SESSION): string[] {
  const due = cardIds
    .filter((id) => cardStatus(states.get(id), now) === "den-han")
    .sort((a, b) => states.get(a)!.dueAt.getTime() - states.get(b)!.dueAt.getTime());
  const fresh = cardIds.filter((id) => !states.has(id)).slice(0, newLimit);
  return [...due, ...fresh];
}
