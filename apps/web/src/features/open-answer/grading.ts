import {
  type AttemptKind, type GradedRubric, type GradeResult, type Level, LEVELS, type Stance,
} from "./types";

// Tính điểm từ phần giảng viên chấm: giảng viên chọn mức đạt từng ý, code cộng điểm theo barem.
// Hàm thuần, dùng cả ở form chấm trong trình duyệt (hiện tổng điểm ngay) và ở máy chủ khi lưu (không tin số trình duyệt gửi).

export const roundQuarter = (n: number) => Math.round(n * 4) / 4;

const FACTOR: Record<Level, number> = { dat: 1, mot_phan: 0.5, thieu: 0, sai: 0 };

export function pointScore(level: Level, diem: number): number {
  return roundQuarter(diem * FACTOR[level]);
}

export const maxScoreOf = (rubric: GradedRubric) => roundQuarter(rubric.points.reduce((s, p) => s + p.diem, 0));

/** Phần giảng viên nhập ở form chấm. */
export interface LecturerGrade {
  /** Mã ý → mức đạt. Phải đủ mọi ý của barem. */
  levels: Record<string, Level>;
  /** Mã ý → nhận xét (không bắt buộc). */
  comments?: Record<string, string>;
  overall?: string;
  /** Bắt buộc với bài phản bác. */
  stance?: Stance;
  /** Theo thứ tự lỗi lập luận trong barem. */
  fallaciesFound?: boolean[];
}

export class GradeInputError extends Error {}

/**
 * Dựng kết quả từ phần giảng viên chấm và tính điểm. Bài phản bác lập trường sai được 0 điểm;
 * lập trường sai hoặc dao động thì gắn cờ để theo dõi, trao đổi riêng với học viên.
 */
export function buildResult(kind: AttemptKind, rubric: GradedRubric, input: LecturerGrade): { result: GradeResult; flagged: boolean } {
  const points = rubric.points.map((p) => {
    const level = input.levels[p.id];
    if (!level || !LEVELS.includes(level)) throw new GradeInputError(`Chưa chọn mức đạt cho ý "${p.y}".`);
    return { id: p.id, level, comment: input.comments?.[p.id]?.trim() ?? "", score: pointScore(level, p.diem) };
  });
  const result: GradeResult = {
    points,
    overall: input.overall?.trim() ?? "",
    score: roundQuarter(points.reduce((s, p) => s + p.score, 0)),
    maxScore: maxScoreOf(rubric),
  };
  if (kind !== "phan_bac") return { result, flagged: false };

  if (!input.stance) throw new GradeInputError("Chưa đánh giá lập trường của bài phản bác.");
  result.stance = input.stance;
  result.fallaciesFound = (rubric.fallacies ?? []).map((_, i) => Boolean(input.fallaciesFound?.[i]));
  if (input.stance === "sai") {
    result.score = 0;
    result.points = points.map((p) => ({ ...p, score: 0 }));
  }
  return { result, flagged: input.stance !== "dung" };
}
