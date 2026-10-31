"use server";

import { z } from "zod";

import { saveAttempt } from "@/features/progress/server/progress";
import { ensureVisitorId } from "@/lib/visitor";

import { drawQuiz, getQuizBank } from "./server/bank";
import { QUIZ_SIZE, type QuizQuestion, type QuizResult } from "./types";

/** Đề mới cho nút "Làm đề khác". Không làm mới cả trang, để kết quả lượt trước không bị xóa giữa chừng. */
export async function newQuiz(subject: string, chapter: number): Promise<QuizQuestion[]> {
  const bank = getQuizBank(z.string().max(32).parse(subject), z.number().int().positive().parse(chapter));
  if (!bank) throw new Error("Chương này chưa có trắc nghiệm.");
  return drawQuiz(bank);
}

const SubmitInput = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
  /** Mã câu → vị trí phương án đã chọn trong file (null nếu bỏ trống). */
  answers: z.record(z.string().max(32), z.number().int().min(0).nullable()),
});

/** Chấm trắc nghiệm trên máy chủ (đáp án không gửi xuống trước khi nộp) và lưu lượt làm vào tiến độ. */
export async function submitQuiz(input: z.input<typeof SubmitInput>): Promise<QuizResult> {
  const { subject, chapter, answers } = SubmitInput.parse(input);
  const bank = getQuizBank(subject, chapter);
  if (!bank) throw new Error("Chương này chưa có trắc nghiệm.");

  const ids = Object.keys(answers);
  if (ids.length === 0 || ids.length > QUIZ_SIZE) throw new Error("Số câu không hợp lệ.");
  const byId = new Map(bank.questions.map((q) => [q.id, q]));

  const items = ids.map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`Không có câu ${id}.`);
    const chosen = answers[id];
    return { id, chosen, answer: q.answer, correct: chosen === q.answer, explain: q.explain, page: q.page };
  });
  const score = items.filter((i) => i.correct).length;

  await saveAttempt({
    visitorId: await ensureVisitorId(),
    subject,
    chapter,
    kind: "quiz",
    score,
    total: items.length,
    details: items.map(({ id, chosen, correct }) => ({ id, chosen, correct })),
  });
  return { score, total: items.length, items };
}
