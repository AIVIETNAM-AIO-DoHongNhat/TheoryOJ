// Ghép ngân hàng câu hỏi trong file với chỉnh sửa của giảng viên. Không chạm DB hay hệ thống file, để kiểm thử được.

export interface BankQuestion {
  id: string;
  q: string;
  options: string[];
  /** Vị trí đáp án đúng trong `options`. */
  answer: number;
  explain: string;
  page?: number;
  /** Chỉ dùng cho đề thi (chỉ có ở ngân hàng ghép cho đề thi, mergeBank với purpose "exam"). */
  examOnly?: boolean;
}

export interface QuizBank {
  subject: string;
  chapter: number;
  reviewed: boolean;
  questions: BankQuestion[];
}

/** Một dòng quiz_questions, chỉ các trường cần để ghép ngân hàng. */
export interface QuestionEdit {
  chapter: number;
  code: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
  page: number | null;
  hidden: boolean;
  examOnly: boolean;
}

/** Chỉnh sửa của giảng viên cho cả một môn: câu soạn, sửa, ẩn và trạng thái duyệt từng chương. */
export interface BankEdits {
  questions: QuestionEdit[];
  /** Chương → đã duyệt hay chưa, chỉ có ở chương giảng viên đã bấm duyệt hoặc bỏ duyệt. */
  reviews: Record<number, boolean>;
}

export const fromEdit = (e: QuestionEdit): BankQuestion => ({
  id: e.code,
  q: e.q,
  options: e.options,
  answer: e.answer,
  explain: e.explain,
  page: e.page ?? undefined,
});

/**
 * Ghép câu trong file với chỉnh sửa của giảng viên: dòng cùng mã thay câu trong file (ẩn thì bỏ), mã mới là câu thêm.
 * Câu trong file giữ thứ tự, câu thêm xếp sau. Null nếu chương không có câu nào ở cả hai nơi.
 * `practice` (trắc nghiệm ôn tập của học viên) bỏ cả câu chỉ dùng cho đề thi; `exam` (bộ chọn câu của đề thi) giữ lại và đánh dấu.
 */
export function mergeBank(
  subject: string,
  chapter: number,
  content: QuizBank | null,
  edits: BankEdits,
  purpose: "practice" | "exam" = "practice",
): QuizBank | null {
  const rows = edits.questions.filter((e) => e.chapter === chapter);
  if (!content && rows.length === 0) return null;
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const questions: BankQuestion[] = [];
  const usable = (e: QuestionEdit) => !e.hidden && (purpose === "exam" || !e.examOnly);
  const take = (e: QuestionEdit) => questions.push(purpose === "exam" ? { ...fromEdit(e), examOnly: e.examOnly } : fromEdit(e));
  for (const q of content?.questions ?? []) {
    const edit = byCode.get(q.id);
    byCode.delete(q.id);
    if (!edit) questions.push(q);
    else if (usable(edit)) take(edit);
  }
  for (const edit of byCode.values()) if (usable(edit)) take(edit);
  return { subject, chapter, reviewed: edits.reviews[chapter] ?? content?.reviewed ?? false, questions };
}
