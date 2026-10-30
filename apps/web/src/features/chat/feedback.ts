// Lý do khi học viên đánh giá 👎, hiện trong ô đánh giá và trong bộ lọc nhật ký.
export const FEEDBACK_REASONS = [
  "Sai nội dung",
  "Trích dẫn không đúng trang",
  "Không đúng trọng tâm câu hỏi",
  "Từ chối nhầm",
  "Khó hiểu, dài dòng",
  "Khác",
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
