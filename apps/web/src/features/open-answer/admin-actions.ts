"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getGraded, saveGrade } from "@/features/admin/server/grading";
import type { ActionResult } from "@/lib/action-result";
import { requireTeacher } from "@/lib/auth/session";

import { buildResult, GradeInputError } from "./grading";
import { LEVELS, MAX_COMMENT, MAX_OVERALL, STANCES } from "./types";

const Input = z.object({
  id: z.number().int().positive(),
  levels: z.record(z.string().max(32), z.enum(LEVELS)),
  comments: z.record(z.string().max(32), z.string().max(MAX_COMMENT)).optional(),
  overall: z.string().max(MAX_OVERALL).optional(),
  stance: z.enum(STANCES).optional(),
  fallaciesFound: z.array(z.boolean()).max(20).optional(),
});

/**
 * Giảng viên chấm (hoặc chấm lại) một bài theo barem chụp lúc nộp. Điểm tính lại trên máy chủ từ mức đạt từng ý,
 * không nhận tổng điểm do trình duyệt gửi. Chỉ chấm được bài của môn mình phụ trách.
 */
export async function gradeSubmission(input: z.input<typeof Input>): Promise<ActionResult> {
  const user = await requireTeacher();
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu chấm không hợp lệ. Nhận xét mỗi ý tối đa 600 ký tự." };
  const { id, ...grade } = parsed.data;

  const attempt = await getGraded(id, user.subjects);
  if (!attempt) return { ok: false, error: "Không tìm thấy bài, hoặc bài không thuộc môn đồng chí phụ trách." };
  try {
    const { result, flagged } = buildResult(attempt.kind, attempt.rubric, grade);
    const saved = await saveGrade({ id, subjects: user.subjects, graderId: user.id, result, flagged });
    if (!saved) return { ok: false, error: "Không lưu được kết quả chấm. Đồng chí tải lại trang và thử lại." };
  } catch (error) {
    if (error instanceof GradeInputError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/quan-tri/cham-bai");
  return { ok: true };
}
