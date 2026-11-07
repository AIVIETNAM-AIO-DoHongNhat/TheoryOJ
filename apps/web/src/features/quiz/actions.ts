"use server";

import { z } from "zod";

import { saveAttempt } from "@/features/progress/server/progress";
import { type DataResult, UserError } from "@/lib/action-result";
import { requireStudent } from "@/lib/auth/session";
import { run } from "@/lib/run-action";

import { gradeQuiz, questionsToGrade } from "./grade";
import { getQuizBank } from "./server/bank";
import { closeDraw, getDraw, issueQuiz } from "./server/draws";
import { QUIZ_SIZE, type QuizQuestion, type QuizResult } from "./types";

/** Đề mới cho nút "Làm đề khác". Không làm mới cả trang, để kết quả lượt trước không bị xóa giữa chừng. */
export async function newQuiz(subject: string, chapter: number): Promise<DataResult<{ drawId: string; questions: QuizQuestion[] }>> {
  return run(async () => {
    const user = await requireStudent();
    const bank = await getQuizBank(z.string().max(32).parse(subject), z.number().int().positive().parse(chapter));
    if (!bank?.questions.length) throw new UserError("Chương này chưa có trắc nghiệm.");
    return issueQuiz(user.visitorId, bank);
  });
}

const SubmitInput = z.object({
  /** Mã đề do newQuiz hoặc trang trắc nghiệm cấp. Môn, chương, các câu của đề đọc từ máy chủ theo mã này. */
  drawId: z.uuid(),
  /** Mã câu → vị trí phương án đã chọn trong file (null nếu bỏ trống). */
  answers: z.record(z.string().max(32), z.number().int().min(0).nullable()).refine((a) => Object.keys(a).length <= QUIZ_SIZE),
  /** Lượt ôn lại câu sai: chấm nhưng không lưu, để không làm sai lệch điểm cao nhất của chương. */
  review: z.boolean().optional(),
});

/**
 * Chấm trắc nghiệm trên máy chủ (đáp án không gửi xuống trước khi nộp) và lưu lượt làm vào tiến độ.
 * Chỉ chấm đúng các câu của đề đã rút, mỗi đề nộp một lần; ôn lại chỉ nhận câu đã sai của đề (features/quiz/grade.ts).
 */
export async function submitQuiz(input: z.input<typeof SubmitInput>): Promise<DataResult<QuizResult>> {
  return run(async () => {
    const user = await requireStudent();
    const { drawId, answers, review = false } = SubmitInput.parse(input);
    const draw = await getDraw(drawId, user.visitorId);
    if (!draw) throw new UserError("Không tìm thấy đề này. Đồng chí bấm “Làm đề khác” để nhận đề mới.");
    const pick = questionsToGrade(draw, answers, review);
    if ("error" in pick) throw new UserError(pick.error);

    const bank = await getQuizBank(draw.subject, draw.chapter);
    const result = gradeQuiz(bank?.questions ?? [], pick.ids, answers);
    if (review) return result;

    if (!(await closeDraw(drawId, user.visitorId, result.items.filter((i) => !i.correct).map((i) => i.id)))) {
      throw new UserError("Đề này đã nộp. Đồng chí bấm “Làm đề khác” để nhận đề mới.");
    }
    if (result.total > 0) {
      await saveAttempt({
        visitorId: user.visitorId,
        subject: draw.subject,
        chapter: draw.chapter,
        kind: "quiz",
        score: result.score,
        total: result.total,
        details: result.items.map(({ id, chosen, correct }) => ({ id, chosen, correct })),
      });
    }
    return result;
  });
}
