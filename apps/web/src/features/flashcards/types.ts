/** Một thẻ ghi nhớ gửi xuống trình duyệt. Nội dung nằm trong content/<môn>/the-ghi-nho/chuong-<n>.yaml. */
export interface Flashcard {
  id: string;
  kind: "khai_niem" | "cong_thuc";
  front: string;
  /** Markdown, công thức trong $...$. */
  back: string;
  /** Trang in trong giáo trình. */
  page?: number;
  /** Thẻ học viên tự tạo (mã `u-<id>`), sửa và xóa được. */
  own?: boolean;
  /** Thẻ tự tạo: trang PDF và tài liệu nơi bôi đen. */
  pdfPage?: number;
  sourceSlug?: string;
}

export const CARD_FRONT_MAX = 300;
export const CARD_BACK_MAX = 1500;
/** Mỗi học viên tự tạo tối đa bấy nhiêu thẻ. */
export const USER_CARDS_MAX = 1000;

/** Trạng thái lịch ôn gửi xuống trình duyệt (ngày giờ dạng ISO để truyền qua ranh giới server/client). */
export interface CardStateDTO {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  reviews: number;
  dueAt: string;
}
