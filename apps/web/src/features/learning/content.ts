/**
 * Câu hỏi gợi ý theo môn và theo chương, bấm vào thì mở trợ lý với câu hỏi điền sẵn.
 * Giảng viên sửa danh sách ở đây (PLAN.md mục 4.2). Mở môn mới thì thêm một khóa cùng id với subjects.ts.
 */
import type { ModeId } from "@/features/chat/modes";

export interface Suggestion {
  mode: ModeId;
  text: string;
}

/** Bốn câu hiện ở màn hình trống của trợ lý. */
export const subjectSuggestions: Record<string, Suggestion[]> = {
  ktct: [
    { mode: "qa", text: "Hàng hóa có những thuộc tính nào?" },
    { mode: "qa", text: "Phân biệt tư bản bất biến và tư bản khả biến." },
    { mode: "exercise", text: "Tư bản ứng trước 500 triệu, c/v = 4/1, m' = 150 %. Tính m và p'." },
    { mode: "practice", text: "Nghị quyết 68-NQ/TW xác định vai trò của kinh tế tư nhân như thế nào?" },
  ],
};

export const chapterQuestions: Record<string, Record<number, Suggestion[]>> = {
  ktct: {
    1: [
      { mode: "qa", text: "Đối tượng nghiên cứu của kinh tế chính trị Mác – Lênin là gì?" },
      { mode: "qa", text: "Trình bày các chức năng của kinh tế chính trị Mác – Lênin." },
      { mode: "practice", text: "Ý nghĩa của việc học kinh tế chính trị đối với cán bộ Công an nhân dân." },
    ],
    2: [
      { mode: "qa", text: "Hàng hóa có những thuộc tính nào?" },
      { mode: "qa", text: "Nội dung và tác động của quy luật giá trị." },
      { mode: "review", text: "Hãy hỏi tôi một câu về chương 2." },
    ],
    3: [
      { mode: "qa", text: "Phân biệt tư bản bất biến và tư bản khả biến." },
      { mode: "exercise", text: "Tư bản ứng trước 500 triệu, c/v = 4/1, m' = 150 %. Tính m và p'." },
      { mode: "qa", text: "So sánh giá trị thặng dư tuyệt đối và giá trị thặng dư tương đối." },
    ],
    4: [
      { mode: "qa", text: "Nguyên nhân hình thành độc quyền là gì?" },
      { mode: "qa", text: "Độc quyền nhà nước trong chủ nghĩa tư bản có những biểu hiện nào?" },
      { mode: "practice", text: "Liên hệ quy luật cạnh tranh với công tác phòng chống gian lận thương mại." },
    ],
    5: [
      { mode: "qa", text: "Đặc trưng của kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam." },
      { mode: "practice", text: "Nghị quyết 68-NQ/TW xác định vai trò của kinh tế tư nhân như thế nào?" },
      { mode: "review", text: "Hãy hỏi tôi một câu về chương 5." },
    ],
    6: [
      { mode: "qa", text: "Vì sao công nghiệp hóa phải gắn với hiện đại hóa?" },
      { mode: "qa", text: "Tác động của hội nhập kinh tế quốc tế đối với phát triển của Việt Nam." },
      { mode: "practice", text: "Liên hệ Nghị quyết 57-NQ/TW với yêu cầu bảo đảm an ninh mạng." },
    ],
  },
};
