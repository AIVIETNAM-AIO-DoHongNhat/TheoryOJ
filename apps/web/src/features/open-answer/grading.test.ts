import { describe, expect, it } from "vitest";

import { buildResult, GradeInputError, maxScoreOf, pointScore } from "./grading";
import type { GradedRubric } from "./types";

const rubric: GradedRubric = {
  prompt: "Phân tích nguồn gốc của giá trị thặng dư.",
  points: [
    { id: "y1", y: "Định nghĩa giá trị thặng dư", diem: 3, page: 53 },
    { id: "y2", y: "Tư bản khả biến", diem: 4, page: 54 },
    { id: "y3", y: "Tư bản bất biến", diem: 3, page: 54 },
  ],
};

const rebuttal: GradedRubric = { ...rubric, fallacies: ["Đánh tráo khái niệm", "Tuyệt đối hóa"] };

describe("pointScore", () => {
  it("tính theo mức đạt, làm tròn 0,25", () => {
    expect(pointScore("dat", 3)).toBe(3);
    expect(pointScore("mot_phan", 1.5)).toBe(0.75);
    expect(pointScore("thieu", 4)).toBe(0);
    expect(pointScore("sai", 4)).toBe(0);
  });

  it("điểm tối đa là tổng điểm barem", () => {
    expect(maxScoreOf(rubric)).toBe(10);
  });
});

describe("buildResult", () => {
  it("tự luận: cộng điểm từ mức đạt giảng viên chọn, giữ nhận xét", () => {
    const { result, flagged } = buildResult("tu_luan", rubric, {
      levels: { y1: "dat", y2: "mot_phan", y3: "thieu" },
      comments: { y2: "  Thiếu ví dụ  " },
      overall: "Nắm được ý chính.",
    });
    expect(result.score).toBe(5);
    expect(result.maxScore).toBe(10);
    expect(result.points[1]).toMatchObject({ level: "mot_phan", comment: "Thiếu ví dụ", score: 2 });
    expect(result.stance).toBeUndefined();
    expect(flagged).toBe(false);
  });

  it("thiếu mức đạt của một ý thì báo lỗi", () => {
    expect(() => buildResult("tu_luan", rubric, { levels: { y1: "dat", y2: "dat" } })).toThrow(GradeInputError);
  });

  it("không nhận mức đạt lạ do trình duyệt gửi", () => {
    expect(() => buildResult("tu_luan", rubric, { levels: { y1: "dat", y2: "dat", y3: "xuat_sac" as never } })).toThrow(GradeInputError);
  });

  it("phản bác: bắt buộc đánh giá lập trường", () => {
    expect(() => buildResult("phan_bac", rebuttal, { levels: { y1: "dat", y2: "dat", y3: "dat" } })).toThrow(GradeInputError);
  });

  it("phản bác lập trường đúng: giữ điểm, ghi lỗi lập luận đã chỉ ra", () => {
    const { result, flagged } = buildResult("phan_bac", rebuttal, {
      levels: { y1: "dat", y2: "dat", y3: "mot_phan" },
      stance: "dung",
      fallaciesFound: [true],
    });
    expect(result.score).toBe(8.5);
    expect(result.fallaciesFound).toEqual([true, false]);
    expect(flagged).toBe(false);
  });

  it("phản bác lập trường sai: 0 điểm và gắn cờ; dao động: giữ điểm, gắn cờ", () => {
    const wrong = buildResult("phan_bac", rebuttal, { levels: { y1: "dat", y2: "dat", y3: "dat" }, stance: "sai" });
    expect(wrong.result.score).toBe(0);
    expect(wrong.result.points.every((p) => p.score === 0)).toBe(true);
    expect(wrong.flagged).toBe(true);
    const wavering = buildResult("phan_bac", rebuttal, { levels: { y1: "dat", y2: "thieu", y3: "thieu" }, stance: "dao_dong" });
    expect(wavering.result.score).toBe(3);
    expect(wavering.flagged).toBe(true);
  });
});
