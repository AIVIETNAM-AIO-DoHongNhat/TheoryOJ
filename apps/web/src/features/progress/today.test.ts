import { describe, expect, it } from "vitest";

import { longestStreak, nextMilestone, pickNextChapter, recentDays, studyStreak, vnDay } from "./today";

describe("chuỗi ngày học", () => {
  it("đếm ngày liên tiếp tới hôm nay", () => {
    expect(studyStreak(["2026-11-01", "2026-11-02", "2026-11-03"], "2026-11-03")).toBe(3);
  });

  it("hôm nay chưa học thì vẫn giữ chuỗi tới hôm qua", () => {
    expect(studyStreak(["2026-11-01", "2026-11-02"], "2026-11-03")).toBe(2);
  });

  it("đứt một ngày thì về 0, qua tháng vẫn đếm đúng", () => {
    expect(studyStreak(["2026-11-01"], "2026-11-03")).toBe(0);
    expect(studyStreak(["2026-10-31", "2026-11-01"], "2026-11-01")).toBe(2);
    expect(studyStreak([], "2026-11-03")).toBe(0);
  });

  it("ngày tính theo giờ Việt Nam", () => {
    // 18 giờ UTC ngày 2 là 1 giờ sáng ngày 3 ở Việt Nam.
    expect(vnDay(new Date("2026-11-02T18:00:00Z"))).toBe("2026-11-03");
  });
});

describe("kỷ lục, mốc và tuần gần nhất", () => {
  it("kỷ lục là chuỗi dài nhất, kể cả chuỗi đã đứt", () => {
    expect(longestStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-11-02", "2026-11-03"])).toBe(3);
    expect(longestStreak(["2026-10-31", "2026-11-01"])).toBe(2);
    expect(longestStreak([])).toBe(0);
  });

  it("mốc tiếp theo luôn lớn hơn chuỗi hiện tại", () => {
    expect(nextMilestone(0)).toBe(3);
    expect(nextMilestone(3)).toBe(7);
    expect(nextMilestone(29)).toBe(30);
    expect(nextMilestone(100)).toBe(200);
    expect(nextMilestone(250)).toBe(300);
  });

  it("bảy ngày gần nhất kết thúc ở hôm nay, có thứ trong tuần", () => {
    const week = recentDays(["2026-11-03", "2026-10-30"], "2026-11-03");
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ day: "2026-10-28", weekday: 3, studied: false });
    expect(week[2].studied).toBe(true);
    expect(week[6]).toEqual({ day: "2026-11-03", weekday: 2, studied: true });
  });
});

describe("chương nên ôn tiếp", () => {
  const chapters = [1, 2, 3].map((number) => ({ number }));
  const counts = { 1: 20, 2: 20, 3: 20 };

  it("ưu tiên chương đã làm mà chưa đạt", () => {
    const rows = [
      { chapter: 1, quizAttempts: 1, quizBest: 0.9 },
      { chapter: 2, quizAttempts: 0, quizBest: null },
      { chapter: 3, quizAttempts: 2, quizBest: 0.4 },
    ];
    expect(pickNextChapter(chapters, rows, counts)?.number).toBe(3);
  });

  it("chưa làm chương nào thì bắt đầu từ chương đầu có câu hỏi", () => {
    expect(pickNextChapter(chapters, [], { 2: 20, 3: 20 })?.number).toBe(2);
  });

  it("đạt hết thì không gợi ý", () => {
    const rows = chapters.map((c) => ({ chapter: c.number, quizAttempts: 1, quizBest: 1 }));
    expect(pickNextChapter(chapters, rows, counts)).toBeUndefined();
  });
});
