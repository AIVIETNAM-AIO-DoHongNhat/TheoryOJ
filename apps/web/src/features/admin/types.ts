/** Bộ lọc nhật ký hỏi đáp ở /quan-tri/hoi-dap. */
export const REVIEW_FILTERS = ["gan-co", "danh-gia", "tu-choi", "kien-thuc-chung", "tat-ca"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

export const REVIEW_FILTER_LABELS: Record<ReviewFilter, string> = {
  "gan-co": "Gắn cờ",
  "danh-gia": "Đánh giá thấp",
  "tu-choi": "Bị từ chối",
  "kien-thuc-chung": "Kiến thức chung",
  "tat-ca": "Tất cả",
};

/** Nhãn lý do từ chối (`messages.refused`). */
export const REFUSAL_LABELS: Record<string, string> = {
  ngoai_pham_vi: "Ngoài phạm vi",
  khieu_khich: "Khiêu khích",
  chen_lenh: "Chèn lệnh",
  thap_diem: "Không đủ căn cứ",
};

/** Nhãn mức căn cứ, chỉ hiện với câu trả lời không hoàn toàn dựa vào tài liệu. */
export const GROUNDING_LABELS: Record<string, string> = {
  mot_phan: "Một phần kiến thức chung",
  kien_thuc_chung: "Kiến thức chung",
};

export interface ReviewItem {
  id: string;
  createdAt: string;
  subject: string;
  question: string;
  answer: string;
  mode: string | null;
  chapters: number[];
  label: string | null;
  refused: string | null;
  /** Mức căn cứ (`Grounding` của trợ lý), null với tin nhắn cũ, câu bị từ chối hoặc chào hỏi. */
  grounding: string | null;
  flagged: boolean;
  reviewed: boolean;
  maxScore: number | null;
  /** Null nếu người hỏi chưa đăng nhập. */
  student: { code: string; name: string; className: string } | null;
  feedback: { rating: number; reason: string | null; comment: string | null } | null;
}
