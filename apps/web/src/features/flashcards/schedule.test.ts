import { describe, expect, it } from "vitest";

import { buildQueue, type CardState, cardStatus, formatInterval, schedule } from "./schedule";

const now = new Date("2026-11-01T08:00:00+07:00");
const days = (s: CardState) => Math.round((s.dueAt.getTime() - now.getTime()) / 86_400_000);

describe("lịch ôn thẻ", () => {
  it("thẻ mới: Khó hẹn 1 ngày, Nhớ 2 ngày, Dễ 5 ngày, Quên hỏi lại sau 10 phút", () => {
    expect(days(schedule(null, "kho", now))).toBe(1);
    expect(days(schedule(null, "nho", now))).toBe(2);
    expect(days(schedule(null, "de", now))).toBe(5);
    const q = schedule(null, "quen", now);
    expect(q.dueAt.getTime() - now.getTime()).toBe(10 * 60_000);
    expect(formatInterval(q, now)).toBe("10 phút");
  });

  it("nhớ liên tiếp thì khoảng ôn giãn dần", () => {
    let s = schedule(null, "nho", now);
    const seen = [s.intervalDays];
    for (let i = 0; i < 4; i++) {
      s = schedule(s, "nho", now);
      seen.push(s.intervalDays);
    }
    expect(seen).toEqual([2, 4, 10, 25, 63]);
    expect(s.reviews).toBe(5);
  });

  it("quên sau khi đã nhớ: tính một lần quên, giảm hệ số, học lại từ đầu", () => {
    const learned = schedule(schedule(null, "nho", now), "nho", now);
    const lapsed = schedule(learned, "quen", now);
    expect(lapsed).toMatchObject({ reps: 0, lapses: 1, intervalDays: 0 });
    expect(lapsed.ease).toBeCloseTo(2.3);
    expect(days(schedule(lapsed, "nho", now))).toBe(2);
  });

  it("Khó và Dễ đổi hệ số, hệ số không xuống dưới 1,3", () => {
    let s = schedule(null, "nho", now);
    for (let i = 0; i < 20; i++) s = schedule(s, "kho", now);
    expect(s.ease).toBe(1.3);
    expect(schedule(schedule(null, "nho", now), "de", now).ease).toBeCloseTo(2.65);
  });

  it("trạng thái thẻ và thứ tự lượt ôn", () => {
    const past = (h: number) => ({ ...schedule(null, "nho", now), dueAt: new Date(now.getTime() - h * 3_600_000) });
    const mastered = { ...schedule(null, "nho", now), intervalDays: 30 };
    const states = new Map<string, CardState>([["a", past(1)], ["b", past(5)], ["c", mastered]]);
    expect(cardStatus(states.get("a"), now)).toBe("den-han");
    expect(cardStatus(states.get("c"), now)).toBe("da-thuoc");
    expect(cardStatus(undefined, now)).toBe("moi");
    expect(buildQueue(["a", "b", "c", "d", "e"], states, now, 1)).toEqual(["b", "a", "d"]);
  });
});
