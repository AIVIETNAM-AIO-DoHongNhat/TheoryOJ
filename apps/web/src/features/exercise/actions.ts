"use server";

import { z } from "zod";

import { EXERCISES, getTemplate, gradeExercise } from "@/domain/ktct/exercises";
import { QUANTITIES, type Quantity, type Step } from "@/domain/ktct/formulas";
import { saveAttempt } from "@/features/progress/server/progress";
import { ensureVisitorId } from "@/lib/visitor";

const quantity = z.enum(Object.keys(QUANTITIES) as [Quantity, ...Quantity[]]);

const SubmitInput = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
  template: z.string().max(64),
  given: z.partialRecord(quantity, z.number().finite().positive().max(1e9)),
  answers: z.partialRecord(quantity, z.number().finite().nullable()),
});

export interface ExerciseResult {
  results: { quantity: Quantity; expected: number; answer: number | null; correct: boolean }[];
  steps: Step[];
}

/** Chấm bài tập: tính lại đáp án từ dữ kiện bằng cùng bộ công thức, rồi lưu lượt làm vào tiến độ. */
export async function submitExercise(input: z.input<typeof SubmitInput>): Promise<ExerciseResult> {
  const { subject, chapter, template: templateId, given, answers } = SubmitInput.parse(input);
  const template = getTemplate(templateId);
  if (!template || !EXERCISES[subject]?.[chapter]?.includes(template)) throw new Error("Không có dạng bài này.");
  // Chỉ nhận đúng các dữ kiện của dạng bài, để không ai gửi kèm sẵn đáp án vào dữ kiện.
  const known = Object.fromEntries(template.given.map((q) => [q, given[q]]));
  if (template.given.some((q) => known[q] === undefined)) throw new Error("Thiếu dữ kiện.");

  const { results, steps } = gradeExercise(template, known, answers);
  const score = results.filter((r) => r.correct).length;

  await saveAttempt({
    visitorId: await ensureVisitorId(),
    subject,
    chapter,
    kind: "exercise",
    score,
    total: results.length,
    details: { template: template.id, given: known, answers, expected: Object.fromEntries(results.map((r) => [r.quantity, r.expected])) },
  });
  return { results, steps };
}
