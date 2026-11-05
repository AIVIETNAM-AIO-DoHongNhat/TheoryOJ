import { BookOpen, Library, MessageSquareText, NotebookPen } from "lucide-react";

import type { Step } from "@/features/review/components/steps";

/**
 * Bốn bước học một chương ở Bài học. Trang chương (/mon/[mon]/chuong/[so]) chia đúng bốn phần theo thứ tự này;
 * học xong thì sang bốn bước ôn ở Ôn tập.
 */
export const LEARN_STEPS: Step[] = [
  {
    icon: BookOpen,
    name: "Đọc",
    tool: "Đọc giáo trình",
    text: "Đọc chương trong giáo trình, bám theo danh sách nội dung chính. Bấm một mục để mở đúng trang.",
  },
  {
    icon: MessageSquareText,
    name: "Hỏi",
    tool: "Hỏi trợ lý",
    text: "Hỏi theo câu gợi ý hoặc câu của đồng chí. Trợ lý trả lời từ giáo trình, kèm trích dẫn trang.",
  },
  {
    icon: Library,
    name: "Mở rộng",
    tool: "Văn kiện và bài viết",
    text: "Liên hệ lý luận với văn kiện của Đảng và bài phân tích của giảng viên về chương.",
  },
  {
    icon: NotebookPen,
    name: "Ghi chép",
    tool: "Ghi chú và tạo thẻ",
    text: "Bôi đen một đoạn khi đọc để ghi chú hoặc tạo thẻ ghi nhớ của riêng mình, dùng lại khi ôn.",
  },
];
