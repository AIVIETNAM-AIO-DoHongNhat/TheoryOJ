import { describe, expect, it } from "vitest";

import {
  answersVisible, buildLayout, classMatches, durationText, effectiveDeadline, examPhase, type ExamQuestion, grade, score10,
} from "./logic";

const q = (key: string, answer = 1): ExamQuestion => ({
  key, chapter: 1, code: key, q: `Câu ${key}`, options: ["a", "b", "c", "d"], answer, explain: "", page: null,
});

describe("examPhase", () => {
  const now = new Date("2026-11-06T08:00:00Z");
  const h = (n: number) => new Date(now.getTime() + n * 3_600_000);
  it("theo trạng thái và giờ mở, đóng", () => {
    expect(examPhase({ status: "nhap", opensAt: null, closesAt: null }, now)).toBe("nhap");
    expect(examPhase({ status: "da-giao", opensAt: h(1), closesAt: null }, now)).toBe("sap-mo");
    expect(examPhase({ status: "da-giao", opensAt: h(-1), closesAt: h(1) }, now)).toBe("dang-mo");
    expect(examPhase({ status: "da-giao", opensAt: null, closesAt: now }, now)).toBe("da-dong");
  });
  it("hạn nộp là mốc sớm hơn giữa hết giờ làm và giờ đóng đề", () => {
    expect(effectiveDeadline(h(1), h(2))).toEqual(h(1));
    expect(effectiveDeadline(h(2), h(1))).toEqual(h(1));
    expect(effectiveDeadline(h(2), null)).toEqual(h(2));
  });
  it("đáp án hiện theo chế độ của đề", () => {
    expect(answersVisible({ reveal: "ngay", closesAt: h(1) }, now)).toBe(true);
    expect(answersVisible({ reveal: "sau-han", closesAt: h(1) }, now)).toBe(false);
    expect(answersVisible({ reveal: "sau-han", closesAt: h(-1) }, now)).toBe(true);
    expect(answersVisible({ reveal: "chi-diem", closesAt: h(-1) }, now)).toBe(false);
  });
});

describe("classMatches", () => {
  it("rỗng là mọi lớp, so khớp không phân biệt hoa thường và khoảng trắng", () => {
    expect(classMatches([], "B2K60")).toBe(true);
    expect(classMatches(["b2k60 ", "B1K59"], "B2K60")).toBe(true);
    expect(classMatches(["B1K59"], "B2K60")).toBe(false);
  });
});

describe("buildLayout và grade", () => {
  const questions = [q("1:a", 0), q("1:b", 3), q("2:a", 2)];
  it("trộn câu và phương án nhưng giữ đủ phần tử", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const layout = buildLayout(questions, true, random);
    expect(layout.map((l) => l.key).sort()).toEqual(["1:a", "1:b", "2:a"]);
    for (const l of layout) expect([...l.options].sort()).toEqual([0, 1, 2, 3]);
    expect(buildLayout(questions, false).map((l) => l.key)).toEqual(["1:a", "1:b", "2:a"]);
  });
  it("chấm theo vị trí phương án gốc, bỏ qua giá trị lạ", () => {
    const r = grade(questions, { "1:a": 0, "1:b": 1, "2:a": 9 } as Record<string, number>);
    expect(r.score).toBe(1);
    expect(r.total).toBe(3);
    expect(r.items.map((i) => i.chosen)).toEqual([0, 1, null]);
  });
});

describe("hiển thị", () => {
  it("điểm thang 10 và thời gian", () => {
    expect(score10(7, 8)).toBe("8,75");
    expect(score10(null, 8)).toBe("—");
    expect(durationText(45)).toBe("45 phút");
    expect(durationText(90)).toBe("1 giờ 30 phút");
    expect(durationText(120)).toBe("2 giờ");
  });
});
