import { describe, expect, it } from "vitest";

import { gradeExercise, isClose, makeExercise, parseAnswer, quantityLabel, TEMPLATES } from "./exercises";
import { solve } from "./formulas";

describe("bài tập sinh số", () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s luôn giải được đủ đại lượng cần tìm", (_, template) => {
    for (let i = 0; i < 200; i++) {
      const { given } = makeExercise(template);
      const { missing, values } = solve(given, template.targets);
      expect(missing).toEqual([]);
      for (const q of template.targets) {
        expect(Number.isFinite(values[q])).toBe(true);
        expect(values[q]!).toBeGreaterThan(0);
      }
    }
  });

  it("chấm đúng đề mẫu của trợ lý: K = 500, c/v = 4, m' = 150 %", () => {
    const template = TEMPLATES.find((t) => t.id === "tu-ban-ung-truoc")!;
    const { results } = gradeExercise(template, { K: 500, cv_ratio: 4, m_rate: 150 }, { m: 150, p_rate: 31 });
    expect(results.map((r) => [r.quantity, r.expected, r.correct])).toEqual([
      ["m", 150, true],
      ["p_rate", 30, false],
    ]);
  });
});

describe("đọc số học viên nhập", () => {
  it.each([
    ["37,5", 37.5],
    ["37.5", 37.5],
    ["1.500", 1500],
    ["1 500", 1500],
    ["1.500,25", 1500.25],
    ["150 %", 150],
    ["", null],
    ["abc", null],
  ])("%s → %s", (raw, expected) => {
    expect(parseAnswer(raw)).toBe(expected);
  });

  it("chấp nhận sai số làm tròn", () => {
    expect(isClose(33.33, 100 / 3)).toBe(true);
    expect(isClose(33, 100 / 3)).toBe(false);
  });
});

describe("lời giải và nhãn", () => {
  it("chỉ giữ bước cần cho đại lượng đề hỏi", () => {
    const template = TEMPLATES.find((t) => t.id === "tu-ban-ung-truoc")!;
    const { steps } = gradeExercise(template, { K: 480, cv_ratio: 5, m_rate: 120 }, {});
    expect(steps.map((s) => s.output)).toEqual(["v", "m", "p_rate"]);
  });

  it("nhãn không lặp ký hiệu", () => {
    expect(quantityLabel("p_rate")).toBe("tỷ suất lợi nhuận");
    expect(quantityLabel("m_rate")).toBe("tỷ suất giá trị thặng dư");
    expect(quantityLabel("K")).toBe("tư bản ứng trước");
    expect(quantityLabel("tg_thang_du")).toBe("thời gian lao động thặng dư");
  });
});
