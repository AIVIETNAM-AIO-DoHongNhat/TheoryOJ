/** Số câu mỗi lượt làm, lấy ngẫu nhiên từ ngân hàng của chương. */
export const QUIZ_SIZE = 10;

/** Đạt từ mức này thì coi là đã nắm chương (bảng tiến độ, gợi ý ôn). */
export const PASS_RATIO = 0.7;

/** Câu hỏi gửi xuống trình duyệt: không kèm đáp án. `key` là vị trí phương án trong file, thứ tự hiển thị đã trộn. */
export interface QuizQuestion {
  id: string;
  q: string;
  options: { key: number; text: string }[];
}

export interface QuizResultItem {
  id: string;
  chosen: number | null;
  answer: number;
  correct: boolean;
  explain: string;
  /** Trang in trong giáo trình. */
  page?: number;
}

export interface QuizResult {
  score: number;
  total: number;
  items: QuizResultItem[];
}
