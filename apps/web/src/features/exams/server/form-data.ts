import "server-only";

import { getSubject } from "@/config/subjects";
import { getClasses } from "@/features/admin/server/stats";
import { getSubjectQuestions } from "@/features/question-bank/server/questions";

import { examKey } from "../logic";
import type { PickerQuestion } from "../types";

/** Câu trong ngân hàng của môn, chương và các lớp đang có học viên, cho form tạo, sửa đề. */
export async function examFormData(subjectId: string) {
  const subject = getSubject(subjectId);
  const [bank, classes] = await Promise.all([getSubjectQuestions(subjectId), getClasses()]);
  const questions: PickerQuestion[] = bank.map((q) => ({
    key: examKey(q.chapter, q.id), chapter: q.chapter, code: q.id, q: q.q, options: q.options, answer: q.answer,
  }));
  return { questions, chapters: subject?.chapters ?? [], classes };
}
