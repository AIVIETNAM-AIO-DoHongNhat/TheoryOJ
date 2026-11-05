/** Bộ lọc nhật ký hỏi đáp ở /quan-tri/hoi-dap. */
export const REVIEW_FILTERS = ["gan-co", "danh-gia", "tu-choi", "tat-ca"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

export const REVIEW_FILTER_LABELS: Record<ReviewFilter, string> = {
  "gan-co": "Gắn cờ",
  "danh-gia": "Bị đánh giá 👎",
  "tu-choi": "Bị từ chối",
  "tat-ca": "Tất cả",
};

/** Nhãn lý do từ chối (`messages.refused`). */
export const REFUSAL_LABELS: Record<string, string> = {
  ngoai_pham_vi: "Ngoài phạm vi",
  khieu_khich: "Khiêu khích",
  chen_lenh: "Chèn lệnh",
  thap_diem: "Không đủ căn cứ",
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
  flagged: boolean;
  reviewed: boolean;
  maxScore: number | null;
  /** Null nếu người hỏi chưa đăng nhập. */
  student: { code: string; name: string; className: string } | null;
  feedback: { rating: number; reason: string | null; comment: string | null } | null;
}
