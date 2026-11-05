/**
 * Đường dẫn hai nhánh của trang. Bài học (/mon) để học: đọc giáo trình, tài liệu, bài viết, hỏi trợ lý.
 * Ôn tập (/on-tap) để luyện: thẻ ghi nhớ, trắc nghiệm, bài tập. Mọi liên kết tới hoạt động luyện dựng qua đây
 * để đường dẫn và breadcrumb luôn cho biết người dùng đang ở nhánh nào.
 * Đường dẫn cũ /mon/<môn>/chuong/<n>/<hoạt động> được chuyển hướng ở next.config.ts.
 */
export const REVIEW_ACTIVITIES = ["the-ghi-nho", "trac-nghiem", "bai-tap"] as const;
export type ReviewActivity = (typeof REVIEW_ACTIVITIES)[number];

export const ACTIVITY_LABELS: Record<ReviewActivity, string> = {
  "the-ghi-nho": "Thẻ ghi nhớ",
  "trac-nghiem": "Trắc nghiệm",
  "bai-tap": "Bài tập",
};

/** Trang ôn của môn, một chương trong trang đó, hoặc một hoạt động luyện của chương. */
export function reviewHref(subject: string, chapter?: number, activity?: ReviewActivity) {
  if (chapter === undefined) return `/on-tap/${subject}`;
  return activity ? `/on-tap/${subject}/chuong/${chapter}/${activity}` : `/on-tap/${subject}#chuong-${chapter}`;
}

/** Trang bài học của môn (lộ trình) hoặc của một chương. */
export function learnHref(subject: string, chapter?: number) {
  return chapter === undefined ? `/mon/${subject}` : `/mon/${subject}/chuong/${chapter}`;
}

/** Breadcrumb chung của trang luyện: Ôn tập › môn › chương › hoạt động. */
export function reviewCrumbs(subject: { id: string; shortName: string }, chapter: number, activity: ReviewActivity) {
  return [
    { label: "Ôn tập", href: "/on-tap" },
    { label: subject.shortName, href: reviewHref(subject.id) },
    { label: `Chương ${chapter}`, href: reviewHref(subject.id, chapter) },
    { label: ACTIVITY_LABELS[activity] },
  ];
}
