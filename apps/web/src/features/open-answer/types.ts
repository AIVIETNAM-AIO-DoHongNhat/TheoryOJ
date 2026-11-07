import type { Citation } from "@/features/chat/types";

// Chấm câu hỏi mở (PLAN.md mục 4.5): tự luận theo barem và phản bác luận điệu sai trái dùng chung một lõi.
// Mô hình chỉ phán đoán mức đạt của từng ý; điểm do code tính, như công cụ tinh_ktct.

export const ATTEMPT_KINDS = ["tu_luan", "phan_bac", "hoi_vat"] as const;
export type AttemptKind = (typeof ATTEMPT_KINDS)[number];

/** Mức đạt của một ý: đủ ý, có nhưng chưa đủ, không có, nêu sai. */
export const LEVELS = ["dat", "mot_phan", "thieu", "sai"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  dat: "Đạt",
  mot_phan: "Đạt một phần",
  thieu: "Còn thiếu",
  sai: "Nêu sai",
};

/** Ba trục chấm của bài phản bác. Tự luận chỉ có một nhóm ý, không gắn trục. */
export const AXES = ["ly_luan", "van_kien", "thuc_tien"] as const;
export type Axis = (typeof AXES)[number];

export const AXIS_LABELS: Record<Axis, string> = {
  ly_luan: "Lý luận",
  van_kien: "Căn cứ văn kiện",
  thuc_tien: "Dẫn chứng thực tiễn",
};

/** Một ý trong barem. `page` là trang in giáo trình; `document` là đường dẫn văn kiện trong manifest. */
export interface RubricPoint {
  id: string;
  y: string;
  diem: number;
  page?: number | null;
  document?: string | null;
  axis?: Axis;
}

/** Barem chụp lúc chấm, lưu cùng bài làm. */
export interface GradedRubric {
  prompt: string;
  points: RubricPoint[];
  /** Lỗi lập luận của luận điệu mà bài phản bác cần chỉ ra. */
  fallacies?: string[];
}

export interface GradedPoint {
  id: string;
  level: Level;
  /** Đoạn trích nguyên văn từ bài làm làm bằng chứng cho mức đạt. */
  quote: string;
  comment: string;
  /** Số thứ tự [n] của đoạn tài liệu làm căn cứ. */
  sources: number[];
  score: number;
  /** Mô hình nêu đoạn trích không có trong bài làm: mức đạt bị hạ. */
  quoteRejected?: boolean;
}

/** Lập trường của bài phản bác. */
export const STANCES = ["dung", "dao_dong", "sai"] as const;
export type Stance = (typeof STANCES)[number];

export interface PublishedRebuttal {
  ten: string;
  bao: string;
  ngay?: string;
  url: string;
}

export interface GradeResult {
  points: GradedPoint[];
  overall: string;
  score: number;
  maxScore: number;
  /** Chỉ có ở bài phản bác. */
  stance?: Stance;
  /** Lỗi lập luận đã chỉ ra, theo thứ tự trong barem. */
  fallaciesFound?: boolean[];
  flagged: boolean;
  /** Lý do gắn cờ, để giảng viên lọc. */
  flagReason?: "lap_truong" | "chen_lenh" | "lap_lai_luan_dieu";
  /** Câu hỏi vặn đã đặt (chỉ ở lượt hỏi vặn). */
  question?: string;
}

/** Kết quả gửi về trình duyệt sau khi chấm. */
export interface GradeResponse {
  attemptId: number;
  result: GradeResult;
  rubric: GradedRubric;
  citations: Citation[];
  /** Bài phản bác chính thống: chỉ gửi sau khi nộp. */
  published?: PublishedRebuttal[];
  lecturerScore?: number | null;
  lecturerNote?: string | null;
}

export const MIN_ANSWER = 80;
export const MAX_ANSWER = 4000;
export const MIN_FOLLOW_UP = 20;
export const MAX_FOLLOW_UP = 1500;
