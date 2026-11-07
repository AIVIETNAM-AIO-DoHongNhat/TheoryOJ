// Kiểm tra bài nộp theo đề đã rút và chấm. Không chạm DB, để kiểm thử được.

import type { BankQuestion } from "./merge";
import type { QuizResult } from "./types";

/** Đề đã rút, như lưu trong bảng quiz_draws. */
export interface DrawState {
  questionIds: string[];
  /** Câu sai hoặc bỏ trống khi nộp; null nếu đề chưa nộp. */
  wrongIds: string[] | null;
}

export type QuizAnswers = Record<string, number | null>;

/**
 * Các câu sẽ chấm, hoặc lời báo lỗi.
 * - Nộp đề: đề chưa nộp; chỉ nhận câu có trong đề; chấm đủ mọi câu của đề, câu không gửi tính là bỏ trống.
 *   Nên không thể nộp riêng vài câu đã biết đáp án để lấy điểm tuyệt đối.
 * - Ôn lại câu sai: đề đã nộp; chỉ nhận các câu đã sai hoặc bỏ trống của đề đó.
 */
export function questionsToGrade(draw: DrawState, answers: QuizAnswers, review: boolean): { ids: string[] } | { error: string } {
  const sent = Object.keys(answers);
  if (review) {
    if (!draw.wrongIds) return { error: "Đề này chưa nộp nên chưa ôn lại câu sai được." };
    const wrong = new Set(draw.wrongIds);
    if (sent.length === 0 || sent.some((id) => !wrong.has(id))) return { error: "Chỉ ôn lại được các câu đã làm sai của đề này." };
    return { ids: sent };
  }
  if (draw.wrongIds) return { error: "Đề này đã nộp. Đồng chí bấm “Làm đề khác” để nhận đề mới." };
  const inDraw = new Set(draw.questionIds);
  if (sent.some((id) => !inDraw.has(id))) return { error: "Bài nộp có câu không thuộc đề này. Đồng chí tải lại trang để nhận đề mới." };
  return { ids: draw.questionIds };
}

/** Chấm theo ngân hàng hiện tại. Câu đã bị gỡ khỏi ngân hàng sau khi rút đề thì bỏ qua, không tính vào tổng. */
export function gradeQuiz(bank: BankQuestion[], ids: string[], answers: QuizAnswers): QuizResult {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const items = ids.flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    const raw = answers[id];
    const chosen = typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    return [{ id, chosen, answer: q.answer, correct: chosen === q.answer, explain: q.explain, page: q.page }];
  });
  return { score: items.filter((i) => i.correct).length, total: items.length, items };
}
