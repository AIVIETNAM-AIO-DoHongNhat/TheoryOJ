/**
 * Toàn bộ câu chữ của landing page (PLAN.md mục 4.4). Khoa sửa lời văn ở đây, không cần chạm vào bố cục.
 * Tên đơn vị và cách xưng hô chờ Khoa chốt (PLAN.md mục 11, quyết định 7).
 */

import type { ModeId } from "@/features/chat/modes";

export const site = {
  name: "TheoryOJ",
  ministry: "Bộ Công an",
  unit: "Học viện An ninh nhân dân",
  facultyShort: "Khoa Lý luận chính trị",
  product: "Trợ lý học tập Lý luận chính trị",
  year: 2026,
};

/**
 * Ô ảnh của Khoa. Chép ảnh vào `apps/web/public/anh-khoa/` rồi điền `src` (ví dụ "/anh-khoa/trang-chu.jpg").
 * Khi `src` để trống, trang hiện khung chờ kèm đường dẫn gợi ý.
 */
export interface Photo {
  src?: string;
  alt: string;
  hint: string;
}

export const photos: { hero: Photo; about: Photo; gallery: Photo[] } = {
  hero: { alt: "Ảnh tiêu biểu của Khoa", hint: "/anh-khoa/trang-chu.jpg" },
  about: { alt: "Tập thể giảng viên Khoa Lý luận chính trị", hint: "/anh-khoa/tap-the.jpg" },
  gallery: [
    { alt: "Giờ giảng trên lớp", hint: "/anh-khoa/gio-giang.jpg" },
    { alt: "Học viên ôn tập, thảo luận", hint: "/anh-khoa/hoc-vien.jpg" },
    { alt: "Hoạt động chuyên môn của Khoa", hint: "/anh-khoa/chuyen-mon.jpg" },
  ],
};

export const hero = {
  overline: "Khoa Lý luận chính trị · Học viện An ninh nhân dân",
  title: "Học tập lý luận chính trị trực tuyến",
  lead:
    "Đọc giáo trình và văn kiện của Đảng, theo dõi bài viết ôn tập của giảng viên, " +
    "hỏi đáp cùng trợ lý học tập có trích dẫn đến từng trang, cho các môn lý luận chính trị của Khoa.",
  primary: { href: "/thu-vien", label: "Vào thư viện" },
  secondary: { href: "/tro-ly", label: "Hỏi trợ lý" },
};

export const quickLinks = [
  { href: "/mon", title: "Học liệu các môn", text: "Học liệu theo môn và theo chương, kèm tài liệu, bài viết và câu hỏi gợi ý." },
  { href: "/thu-vien", title: "Thư viện tài liệu", text: "Giáo trình, văn kiện, tài liệu tham khảo đọc trực tuyến hoặc tải về." },
  { href: "/bai-viet", title: "Bài viết", text: "Hướng dẫn và bài ôn tập do giảng viên Khoa biên soạn." },
  { href: "/tro-ly", title: "Trợ lý học tập", text: "Hỏi đáp, giải bài tập, liên hệ thực tiễn và ôn thi, có trích nguồn." },
];

export const latestPosts = {
  overline: "Bài viết",
  title: "Bài viết mới",
  more: "Tất cả bài viết",
};

export const about = {
  overline: "Giới thiệu",
  title: "Ứng dụng chuyển đổi số trong dạy và học lý luận chính trị",
  paragraphs: [
    "Hưởng ứng yêu cầu chuyển đổi số trong giáo dục, đào tạo, Khoa Lý luận chính trị xây dựng TheoryOJ, " +
      "trang học tập trực tuyến cho các môn lý luận chính trị: thư viện tài liệu, học liệu theo chương, bài viết của giảng viên và trợ lý học tập ứng dụng trí tuệ nhân tạo.",
    "Trợ lý không thay thế giáo trình và bài giảng của giảng viên. Hệ thống giúp học viên tra cứu nhanh, " +
      "tự ôn tập ngoài giờ lên lớp và rèn luyện kỹ năng vận dụng lý luận vào thực tiễn công tác bảo vệ an ninh quốc gia.",
  ],
  goals: [
    "Tra cứu nhanh, chính xác theo giáo trình",
    "Hướng dẫn giải bài tập theo từng bước",
    "Liên hệ lý luận với thực tiễn công tác",
    "Tự kiểm tra, ôn tập theo chương",
  ],
};

export const features = {
  overline: "Trợ lý học tập",
  title: "Hỏi đáp cùng trợ lý, có nguồn đến từng trang",
  lead: "Trợ lý chỉ trả lời từ tài liệu trong Thư viện. Học viên chọn chế độ phù hợp; mỗi ý trong câu trả lời đều dẫn về trang gốc để đối chiếu.",
  bullets: {
    qa: ["Dùng đúng thuật ngữ của giáo trình", "Bấm vào nguồn để xem đoạn gốc"],
    exercise: ["Bốn bước: dữ kiện, công thức, tính, kết luận", "Báo rõ khi đề thiếu dữ kiện"],
    practice: ["Căn cứ nghị quyết của Đảng", "Liên hệ nhiệm vụ bảo vệ an ninh kinh tế"],
    review: ["Câu hỏi tự luận theo từng chương", "Chỉ ra ý còn thiếu so với giáo trình"],
  } satisfies Record<ModeId, string[]>,
};

export const subjectsSection = {
  overline: "Học liệu",
  title: "Các môn lý luận chính trị",
  lead: "Mỗi môn có học liệu theo chương, tài liệu trong Thư viện và trợ lý học tập riêng. Các môn được bổ sung dần theo kế hoạch của Khoa.",
};

export const principles = {
  overline: "Nguyên tắc",
  title: "Nguyên tắc hoạt động",
  lead: "Trợ lý mang danh nghĩa một học viện Công an nhân dân, nên độ chính xác và an toàn thông tin được đặt lên hàng đầu.",
  items: [
    { title: "Chỉ dùng nguồn chính thống", text: "Câu trả lời được viết từ các đoạn tìm thấy trong giáo trình và văn kiện, không dùng kiến thức bên ngoài." },
    { title: "Trích dẫn đến từng trang", text: "Mỗi ý đều ghi nguồn; học viên bấm vào để xem đoạn gốc, chương và trang in để đối chiếu." },
    { title: "Từ chối nội dung ngoài phạm vi", text: "Câu hỏi ngoài môn học, xuyên tạc hoặc khiêu khích nhận câu từ chối cố định và được ghi nhận để rà soát." },
    { title: "Dữ liệu lưu tại Học viện", text: "Máy chủ, cơ sở dữ liệu và mô hình ngôn ngữ ưu tiên đặt tại hạ tầng của Học viện." },
  ],
  steps: ["Kiểm tra câu hỏi", "Tra cứu tài liệu", "Trả lời kèm nguồn"],
};

export const facultySection = {
  overline: "Khoa Lý luận chính trị",
  title: "Đồng hành cùng học viên",
  lead: "Nội dung của trợ lý do giảng viên Khoa biên soạn, kiểm định và cập nhật theo chương trình đào tạo của Học viện.",
};

export const roadmap = {
  title: "Lộ trình các môn",
  lead: "Các môn còn lại được bổ sung học liệu và dùng chung một trợ lý.",
};

export const faq = {
  overline: "Hỏi đáp",
  title: "Câu hỏi thường gặp",
  items: [
    {
      q: "Ai được sử dụng trợ lý?",
      a: "Trong giai đoạn thử nghiệm, trợ lý dành cho học viên có tài khoản do Học viện cấp. Trang giới thiệu và học liệu theo chương được công khai.",
    },
    {
      q: "Trợ lý có thay thế giáo trình không?",
      a: "Không. Trợ lý giúp tra cứu và ôn tập nhanh hơn. Khi ôn thi, đồng chí cần đối chiếu với giáo trình và bài giảng của giảng viên.",
    },
    {
      q: "Câu hỏi của tôi được sử dụng như thế nào?",
      a: "Câu hỏi được lưu trên máy chủ của Học viện để giảng viên nâng cao chất lượng trả lời, không gửi sang dịch vụ bên ngoài khi chưa được phép.",
    },
    {
      q: "Vì sao trợ lý từ chối câu hỏi của tôi?",
      a: "Trợ lý chỉ trả lời nội dung thuộc môn học và có trong tài liệu. Nếu câu hỏi hợp lệ mà vẫn bị từ chối, đồng chí hãy diễn đạt sát giáo trình hơn hoặc hỏi giảng viên.",
    },
  ],
};

export const cta = {
  title: "Bắt đầu ôn tập cùng trợ lý",
  text: "Chọn chương, đặt câu hỏi và đối chiếu câu trả lời với giáo trình.",
  primary: { href: "/tro-ly", label: "Sử dụng trợ lý" },
  secondary: { href: "/tro-ly?che-do=review", label: "Ôn thi theo chương" },
};

export const footer = {
  tagline: "Trợ lý học tập các môn lý luận chính trị, trả lời từ giáo trình và văn kiện chính thống.",
  // Khoa điền thông tin liên hệ; dòng nào để trống sẽ không hiển thị.
  contact: [
    { label: "Địa chỉ", value: "" },
    { label: "Điện thoại", value: "" },
    { label: "Thư điện tử", value: "" },
  ],
  columns: [
    {
      title: "Trợ lý",
      links: [
        { label: "Hỏi đáp lý thuyết", href: "/tro-ly?che-do=qa" },
        { label: "Hướng dẫn giải bài tập", href: "/tro-ly?che-do=exercise" },
        { label: "Liên hệ thực tiễn", href: "/tro-ly?che-do=practice" },
        { label: "Ôn thi", href: "/tro-ly?che-do=review" },
      ],
    },
    {
      title: "Học tập",
      links: [
        { label: "Học liệu các môn", href: "/mon" },
        { label: "Thư viện tài liệu", href: "/thu-vien" },
        { label: "Bài viết", href: "/bai-viet" },
        { label: "Giới thiệu", href: "/gioi-thieu" },
        { label: "Câu hỏi thường gặp", href: "/gioi-thieu#hoi-dap" },
      ],
    },
  ],
  disclaimer:
    "Câu trả lời do trí tuệ nhân tạo tạo ra từ tài liệu chính thống và có thể chưa chính xác. Đồng chí cần đối chiếu với giáo trình và hỏi giảng viên khi cần.",
};
