import { describe, expect, it } from "vitest";

import { gradeQuiz, questionsToGrade } from "./grade";
import type { BankQuestion } from "./merge";

const bank: BankQuestion[] = ["a", "b", "c"].map((id) => ({ id, q: id, options: ["x", "y", "z"], answer: 1, explain: "" }));
const fresh = { questionIds: ["a", "b", "c"], wrongIds: null };

describe("nộp đề trắc nghiệm", () => {
  it("chấm đủ mọi câu của đề, câu không gửi tính là bỏ trống", () => {
    const pick = questionsToGrade(fresh, { a: 1 }, false);
    expect(pick).toEqual({ ids: ["a", "b", "c"] });
    const result = gradeQuiz(bank, (pick as { ids: string[] }).ids, { a: 1 });
    expect([result.score, result.total]).toEqual([1, 3]);
    expect(result.items.map((i) => i.chosen)).toEqual([1, null, null]);
  });

  it("không nhận câu ngoài đề, không nộp lại đề đã nộp", () => {
    expect(questionsToGrade(fresh, { a: 1, zz: 0 }, false)).toHaveProperty("error");
    expect(questionsToGrade({ ...fresh, wrongIds: [] }, { a: 1 }, false)).toHaveProperty("error");
  });

  it("ôn lại chỉ nhận câu đã sai của đề đã nộp", () => {
    const done = { ...fresh, wrongIds: ["b", "c"] };
    expect(questionsToGrade(done, { b: 1 }, true)).toEqual({ ids: ["b"] });
    expect(questionsToGrade(done, { a: 1 }, true)).toHaveProperty("error");
    expect(questionsToGrade(done, {}, true)).toHaveProperty("error");
    expect(questionsToGrade(fresh, { a: 1 }, true)).toHaveProperty("error");
  });

  it("bỏ qua câu đã gỡ khỏi ngân hàng, phương án ngoài khoảng tính là bỏ trống", () => {
    const result = gradeQuiz(bank.slice(0, 2), ["a", "b", "c"], { a: 7, b: 1 });
    expect(result.total).toBe(2);
    expect(result.items.map((i) => [i.id, i.chosen, i.correct])).toEqual([["a", null, false], ["b", 1, true]]);
  });
});
