"use server";

import { z } from "zod";

import { env } from "@/lib/env";
import { ensureVisitorId } from "@/lib/visitor";

import { questionsFor } from "./questions";
import { saveSurvey } from "./server/responses";

const SubmitInput = z.object({
  role: z.enum(["hoc-vien", "giang-vien"]),
  answers: z.record(z.string().max(32), z.number().int().min(1).max(5)),
  comment: z.string().trim().max(1000).optional(),
});

/** Lưu phiếu của đợt đang mở. Mỗi trình duyệt một phiếu mỗi đợt; gửi lại thì ghi đè phiếu cũ. */
export async function submitSurvey(input: z.input<typeof SubmitInput>): Promise<{ ok: true }> {
  const { role, answers, comment } = SubmitInput.parse(input);
  const phase = env.SURVEY_PHASE;
  if (phase === "dong") throw new Error("Khảo sát đã đóng.");
  const questions = questionsFor(role, phase);
  // Chỉ nhận đúng các câu của phiếu, và phải trả lời đủ.
  if (questions.some((q) => answers[q.id] === undefined)) throw new Error("Chưa trả lời đủ các câu.");
  const kept = Object.fromEntries(questions.map((q) => [q.id, answers[q.id]]));
  await saveSurvey({ visitorId: await ensureVisitorId(), phase, role, answers: kept, comment: comment || null });
  return { ok: true };
}
