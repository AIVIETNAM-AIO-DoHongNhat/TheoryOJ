/**
 * Phiếu khảo sát thang 5 điểm cho hồ sơ sáng kiến (PLAN.md mục 10). Các câu "chung" hỏi cả trước và sau đợt
 * thử nghiệm để so sánh; câu "sau" chỉ hỏi khi đã dùng. Đổi lời câu hỏi thì giữ nguyên `id`, thêm câu thì dùng `id` mới,
 * vì kết quả lưu theo `id`.
 */

export type SurveyPhase = "truoc" | "sau";
export type SurveyRole = "hoc-vien" | "giang-vien";

export interface SurveyQuestion {
  id: string;
  text: string;
  phases: SurveyPhase[];
}

const BOTH: SurveyPhase[] = ["truoc", "sau"];
const AFTER: SurveyPhase[] = ["sau"];

export const SURVEY_QUESTIONS: Record<SurveyRole, SurveyQuestion[]> = {
  "hoc-vien": [
    { id: "hv-hieu-khai-niem", text: "Tôi hiểu rõ các khái niệm cơ bản của môn Kinh tế chính trị Mác – Lênin.", phases: BOTH },
    { id: "hv-tra-cuu", text: "Tôi tìm được nhanh nội dung cần tra trong giáo trình và văn kiện.", phases: BOTH },
    { id: "hv-bai-tap", text: "Tôi tự giải được các bài tập tính toán của môn học.", phases: BOTH },
    { id: "hv-lien-he", text: "Tôi tự tin liên hệ lý luận với thực tiễn và nhiệm vụ của lực lượng Công an nhân dân.", phases: BOTH },
    { id: "hv-hung-thu", text: "Tôi hứng thú với việc học môn này.", phases: BOTH },
    { id: "hv-chinh-xac", text: "Câu trả lời của trợ lý chính xác, bám sát giáo trình.", phases: AFTER },
    { id: "hv-trich-dan", text: "Trích dẫn đến trang giáo trình giúp tôi kiểm chứng câu trả lời.", phases: AFTER },
    { id: "hv-on-tap", text: "Trắc nghiệm và bài tập theo chương giúp tôi ôn tập hiệu quả hơn.", phases: AFTER },
    { id: "hv-de-dung", text: "Trang web dễ sử dụng trên điện thoại và máy tính.", phases: AFTER },
    { id: "hv-gioi-thieu", text: "Tôi muốn tiếp tục sử dụng và giới thiệu cho đồng chí khác.", phases: AFTER },
  ],
  "giang-vien": [
    { id: "gv-tu-hoc", text: "Học viên chủ động tự học, tự tra cứu giáo trình và văn kiện.", phases: BOTH },
    { id: "gv-van-dung", text: "Học viên vận dụng được lý luận vào bài tập và liên hệ thực tiễn.", phases: BOTH },
    { id: "gv-thoi-gian", text: "Thời gian giải đáp thắc mắc của học viên ngoài giờ lên lớp ở mức hợp lý.", phases: BOTH },
    { id: "gv-chinh-xac", text: "Câu trả lời của trợ lý chính xác về nội dung và đúng định hướng chính trị.", phases: AFTER },
    { id: "gv-tu-choi", text: "Trợ lý từ chối đúng các câu hỏi ngoài phạm vi hoặc mang tính khiêu khích.", phases: AFTER },
    { id: "gv-ngan-hang", text: "Ngân hàng trắc nghiệm và bài tập phù hợp với chương trình môn học.", phases: AFTER },
    { id: "gv-nhan-rong", text: "Nên nhân rộng mô hình cho các môn lý luận chính trị khác.", phases: AFTER },
  ],
};

export const SCALE = [
  { value: 1, label: "Hoàn toàn không đồng ý" },
  { value: 2, label: "Không đồng ý" },
  { value: 3, label: "Phân vân" },
  { value: 4, label: "Đồng ý" },
  { value: 5, label: "Hoàn toàn đồng ý" },
] as const;

export const PHASE_LABELS: Record<SurveyPhase, string> = {
  truoc: "Trước khi sử dụng",
  sau: "Sau đợt sử dụng thử",
};

export const ROLE_LABELS: Record<SurveyRole, string> = {
  "hoc-vien": "Học viên",
  "giang-vien": "Giảng viên",
};

export function questionsFor(role: SurveyRole, phase: SurveyPhase): SurveyQuestion[] {
  return SURVEY_QUESTIONS[role].filter((q) => q.phases.includes(phase));
}
