// Báo cho nút ngọn lửa ở đầu trang biết học viên vừa học xong một việc (nộp bài, ôn thẻ),
// để chuỗi sáng lên ngay mà không phải tải lại cả trang: đầu trang nằm trong layout nên không tự vẽ lại khi chuyển trang.

export const STUDIED_EVENT = "theoryoj:da-hoc";

export function markStudied() {
  window.dispatchEvent(new Event(STUDIED_EVENT));
}
