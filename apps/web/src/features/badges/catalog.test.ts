import { describe, expect, it } from "vitest";

import { type BadgeStats, type ChapterStats, chapterCriteria, closestBadges, evaluateBadges } from "./catalog";

const chapter = (over: Partial<ChapterStats> = {}): ChapterStats => ({
  number: 1,
  title: "Chương thử",
  quizBest: null,
  cardTotal: 10,
  cardsMastered: 0,
  hasExercises: false,
  exercisesSolved: 0,
  ...over,
});

const stats = (over: Partial<BadgeStats> = {}): BadgeStats => ({
  bestStreak: 0,
  quizAttempts: 0,
  perfectQuizzes: 0,
  exercisesSolved: 0,
  cardReviews: 0,
  cardsMastered: 0,
  ownCards: 0,
  questions: 0,
  notes: 0,
  subjects: [{ id: "ktct", shortName: "KTCT", chapters: [chapter({ number: 1 }), chapter({ number: 2 })] }],
  ...over,
});

const byId = (s: BadgeStats) => new Map(evaluateBadges(s).map((b) => [b.id, b]));

describe("huy hiệu thành tích", () => {
  it("học viên mới chưa có huy hiệu nào", () => {
    expect(evaluateBadges(stats()).filter((b) => b.earned)).toEqual([]);
  });

  it("đủ chỉ tiêu thì đạt, thiếu một thì chưa", () => {
    const b = byId(stats({ bestStreak: 7, quizAttempts: 9, questions: 1 }));
    expect(b.get("chuoi-3")?.earned).toBe(true);
    expect(b.get("chuoi-7")?.earned).toBe(true);
    expect(b.get("chuoi-14")?.earned).toBe(false);
    expect(b.get("tn-10")).toMatchObject({ earned: false, current: 9, target: 10 });
    expect(b.get("hoi-1")?.earned).toBe(true);
  });

  it("chưa môn nào có bài tập tính toán thì không hiện huy hiệu bài tập", () => {
    expect(byId(stats()).has("bt-1")).toBe(false);
    const withExercises = stats({ subjects: [{ id: "ktct", shortName: "KTCT", chapters: [chapter({ hasExercises: true })] }] });
    expect(byId(withExercises).has("bt-1")).toBe(true);
  });
});

describe("huy chương chương học", () => {
  it("đạt trắc nghiệm thì nhận huy chương đồng, tiến độ tính theo câu đúng", () => {
    const b = byId(stats({ subjects: [{ id: "ktct", shortName: "KTCT", chapters: [chapter({ quizBest: 0.7 }), chapter({ number: 2, quizBest: 0.5 })] }] }));
    expect(b.get("chuong:ktct:1")).toMatchObject({ earned: true, tier: "dong" });
    expect(b.get("chuong:ktct:2")).toMatchObject({ earned: false, current: 5, target: 7 });
    expect(b.get("mon:ktct")).toMatchObject({ earned: false, current: 1, target: 2 });
  });

  it("đủ mọi tiêu chí thì lên vàng", () => {
    const full = chapter({ quizBest: 1, cardsMastered: 8, hasExercises: true, exercisesSolved: 1 });
    expect(chapterCriteria(full).every((c) => c.met)).toBe(true);
    const b = byId(stats({ subjects: [{ id: "ktct", shortName: "KTCT", chapters: [full] }] }));
    expect(b.get("chuong:ktct:1")?.tier).toBe("vang");
    expect(b.get("mon:ktct")?.earned).toBe(true);
  });

  it("chương không có thẻ, không có bài tập thì chỉ xét trắc nghiệm", () => {
    const criteria = chapterCriteria(chapter({ cardTotal: 0, quizBest: 0.8 }));
    expect(criteria.map((c) => c.met)).toEqual([true, false]);
  });

  it("thuộc chưa tới 80 % thẻ thì chưa có sao thẻ", () => {
    expect(chapterCriteria(chapter({ cardsMastered: 7 }))[1].met).toBe(false);
    expect(chapterCriteria(chapter({ cardsMastered: 8 }))[1].met).toBe(true);
  });
});

describe("huy hiệu gần đạt", () => {
  it("xếp theo tỷ lệ đã đi được, bỏ huy hiệu đã đạt", () => {
    const close = closestBadges(evaluateBadges(stats({ bestStreak: 5, quizAttempts: 1 })), 2);
    expect(close.map((b) => b.id)).toEqual(["chuoi-7", "tn-10"]);
  });
});
