"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setLecturerScore } from "@/features/admin/server/grading";
import type { ActionResult } from "@/lib/action-result";
import { requireTeacher } from "@/lib/auth/session";

const Input = z.object({
  id: z.number().int().positive(),
  /** Null để xóa điểm đã chấm. */
  score: z.number().min(0).max(100).multipleOf(0.25).nullable(),
  note: z.string().trim().max(1000).nullable(),
});

/** Giảng viên chấm lại một bài: điểm hiện cho học viên và được dùng để đo độ đồng thuận với hệ thống chấm. */
export async function gradeByLecturer(input: z.input<typeof Input>): Promise<ActionResult> {
  const user = await requireTeacher("/quan-tri/cham-bai");
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Điểm phải từ 0 và là bội của 0,25." };
  const { id, score, note } = parsed.data;
  const saved = await setLecturerScore({ id, score, note: note || null, reviewerId: user.id });
  if (!saved) return { ok: false, error: "Không lưu được: điểm vượt điểm tối đa của barem hoặc bài không còn." };
  revalidatePath("/quan-tri/cham-bai");
  return { ok: true };
}
