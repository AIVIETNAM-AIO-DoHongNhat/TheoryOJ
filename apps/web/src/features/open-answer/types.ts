// Bài tự luận và bài phản bác (PLAN.md mục 4.5). Học viên nộp bài, giảng viên phụ trách môn chấm từng ý theo barem
// do Khoa duyệt; không dùng AI. Giảng viên chọn mức đạt từng ý, tổng điểm do code tính (grading.ts).

export const ATTEMPT_KINDS = ["tu_luan", "phan_bac"] as const;
export type AttemptKind = (typeof ATTEMPT_KINDS)[number];

export const KIND_LABELS: Record<AttemptKind, string> = { tu_luan: "Tự luận", phan_bac: "Phản bác" };

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

/** Barem chụp lúc nộp, lưu cùng bài làm. */
export interface GradedRubric {
  prompt: string;
  points: RubricPoint[];
  /** Lỗi lập luận của luận điệu mà bài phản bác cần chỉ ra. */
  fallacies?: string[];
}

/** Lập trường của bài phản bác, giảng viên đánh giá. */
export const STANCES = ["dung", "dao_dong", "sai"] as const;
export type Stance = (typeof STANCES)[number];

export const STANCE_LABELS: Record<Stance, string> = {
  dung: "Lập trường đúng",
  dao_dong: "Lập trường chưa vững",
  sai: "Chưa phản bác, đồng tình với luận điệu",
};

export interface GradedPoint {
  id: string;
  level: Level;
  /** Nhận xét của giảng viên cho ý này (không bắt buộc). */
  comment: string;
  score: number;
}

/** Kết quả giảng viên chấm. */
export interface GradeResult {
  points: GradedPoint[];
  /** Nhận xét chung của giảng viên. */
  overall: string;
  score: number;
  maxScore: number;
  /** Chỉ có ở bài phản bác. */
  stance?: Stance;
  /** Lỗi lập luận bài làm đã chỉ ra, theo thứ tự trong barem. */
  fallaciesFound?: boolean[];
}

export interface PublishedRebuttal {
  ten: string;
  bao: string;
  ngay?: string;
  url: string;
}

/** Bài đã nộp, gửi xuống trình duyệt của học viên. Barem và kết quả chỉ có khi giảng viên đã chấm. */
export interface Submission {
  attemptId: number;
  answer: string;
  /** ISO, thời điểm nộp (hoặc sửa) gần nhất. */
  submittedAt: string;
  status: "cho_cham" | "da_cham";
  rubric?: GradedRubric;
  result?: GradeResult;
  gradedAt?: string;
  graderName?: string | null;
  /** Bài phản bác chính thống: chỉ gửi khi đã chấm. */
  published?: PublishedRebuttal[];
}

export const MIN_ANSWER = 80;
export const MAX_ANSWER = 4000;
export const MAX_COMMENT = 600;
export const MAX_OVERALL = 1500;
