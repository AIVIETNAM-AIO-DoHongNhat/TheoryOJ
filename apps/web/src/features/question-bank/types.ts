/** Nguồn của một câu: trong file content/ (gốc), câu trong file đã được giảng viên sửa, hay câu giảng viên soạn mới. */
export type QuestionSource = "goc" | "da-sua" | "moi";

export const SOURCE_LABELS: Record<QuestionSource, string> = {
  goc: "Gốc",
  "da-sua": "Đã sửa",
  moi: "Giảng viên soạn",
};

export interface QuestionContent {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  page: number | null;
}

export interface AdminQuestion extends QuestionContent {
  code: string;
  source: QuestionSource;
  hidden: boolean;
  /** Bản trong file trước khi sửa, để so và khôi phục. */
  original: QuestionContent | null;
  updatedAt: string | null;
  updatedBy: string | null;
  /** Số lần câu xuất hiện trong lượt trắc nghiệm ôn tập và tỷ lệ làm đúng. */
  attempts: number;
  correctRate: number | null;
}

export interface ChapterBankSummary {
  chapter: number;
  title: string;
  /** Số câu học viên đang thấy (đã bỏ câu ẩn). */
  visible: number;
  added: number;
  hidden: number;
  reviewed: boolean;
}
