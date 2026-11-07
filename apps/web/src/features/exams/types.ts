import type { ExamPhase, Reveal } from "./logic";

/** Một dòng trong danh sách đề ở trang quản trị. Ngày giờ dạng ISO để truyền xuống client. */
export interface ExamSummary {
  id: number;
  title: string;
  subject: string;
  questionCount: number;
  durationMin: number;
  opensAt: string | null;
  closesAt: string | null;
  classes: string[];
  status: "nhap" | "da-giao";
  phase: ExamPhase;
  /** Số học viên đã nộp ít nhất một lượt, số đang làm. */
  submitted: number;
  inProgress: number;
  /** Trung bình tỷ lệ đúng lượt cao nhất của mỗi học viên, 0–1. */
  avgRatio: number | null;
  createdAt: string;
}

/** Dữ liệu cho form tạo, sửa đề. */
export interface ExamDraft {
  id: number | null;
  subject: string;
  title: string;
  description: string;
  questionKeys: string[];
  durationMin: number;
  opensAt: string | null;
  closesAt: string | null;
  classes: string[];
  maxAttempts: number;
  shuffle: boolean;
  reveal: Reveal;
  status: "nhap" | "da-giao";
  /** Đã có lượt làm thì không đổi câu hỏi, cách trộn được nữa. */
  locked: boolean;
}

/** Câu trong ngân hàng cho bộ chọn câu của form đề. */
export interface PickerQuestion {
  key: string;
  chapter: number;
  code: string;
  q: string;
  options: string[];
  answer: number;
}

/** Câu gửi xuống trình duyệt khi đang làm bài: không có đáp án, phương án đã xếp theo thứ tự của lượt. */
export interface PaperQuestion {
  key: string;
  q: string;
  options: { key: number; text: string }[];
}

/** Câu của bài đã nộp, khi đề cho xem đáp án. */
export interface ReviewItem extends PaperQuestion {
  chapter: number;
  chosen: number | null;
  answer: number;
  correct: boolean;
  explain: string;
  page: number | null;
}

export interface AttemptInfo {
  id: number;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  total: number;
  autoSubmitted: boolean;
}

/** Thẻ đề ở trang /de-thi của học viên. */
export interface StudentExamItem {
  id: number;
  title: string;
  description: string;
  subject: string;
  questionCount: number;
  durationMin: number;
  opensAt: string | null;
  closesAt: string | null;
  phase: ExamPhase;
  maxAttempts: number;
  attemptsUsed: number;
  inProgress: boolean;
  best: { score: number; total: number } | null;
}
