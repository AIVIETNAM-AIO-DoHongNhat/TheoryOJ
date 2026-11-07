import "server-only";

import { getSubject } from "@/config/subjects";
import { getClasses } from "@/features/admin/server/stats";
import { getSubjectQuestions } from "@/features/question-bank/server/questions";
import { rosterClasses } from "@/features/roster/server/roster";

import { examKey } from "../logic";
import type { PickerQuestion } from "../types";

/**
 * Câu dùng được cho đề thi của môn, chương, và các lớp (theo danh sách học viên và theo tài khoản đã đăng ký),
 * cho form tạo, sửa đề. Số học viên của lớp lấy số lớn hơn giữa danh sách và số tài khoản.
 */
export async function examFormData(subjectId: string) {
  const subject = getSubject(subjectId);
  const [bank, registered, listed] = await Promise.all([getSubjectQuestions(subjectId), getClasses(), rosterClasses()]);
  const questions: PickerQuestion[] = bank.map((q) => ({
    key: examKey(q.chapter, q.id), chapter: q.chapter, code: q.id, q: q.q, options: q.options, answer: q.answer,
    examOnly: !!q.examOnly,
  }));
  const counts = new Map<string, number>();
  for (const c of [...listed, ...registered]) counts.set(c.name, Math.max(counts.get(c.name) ?? 0, c.students));
  const classes = [...counts].map(([name, students]) => ({ name, students })).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return { questions, chapters: subject?.chapters ?? [], classes };
}
