/**
 * Toàn bộ câu chữ của landing page (PLAN.md mục 4.4). Khoa sửa lời văn ở đây, không cần chạm vào bố cục.
 * Tên đơn vị và cách xưng hô chờ Khoa chốt (PLAN.md mục 11, quyết định 7).
 */

import type { ModeId } from "@/features/chat/modes";

export const site = {
  name: "TheoryOJ",
  ministry: "Bộ Công an",
  unit: "Học viện An ninh nhân dân",
  facultyShort: "Khoa LLCT&KHXHNV",
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

// Ảnh do Khoa cung cấp (nguồn ghi trong public/anh-khoa/NGUON.md), đã thu nhỏ; ảnh hero cắt khung 4:5.
export const photos: { hero: Photo; about: Photo; gallery: Photo[] } = {
  hero: {
    src: "/anh-khoa/nghi-thuc-chao.jpg",
    alt: "Nữ cán bộ, giảng viên trong lễ phục Công an nhân dân thực hiện nghi thức chào",
    hint: "/anh-khoa/nghi-thuc-chao.jpg",
  },
  about: {
    src: "/anh-khoa/truoc-hoc-vien.jpg",
    alt: "Cán bộ, giảng viên trong lễ phục chụp ảnh trước tòa nhà và các tượng đài trong khuôn viên Học viện",
    hint: "/anh-khoa/truoc-hoc-vien.jpg",
  },
  gallery: [
    {
      src: "/anh-khoa/anh-tap-the.jpg",
      alt: "Tập thể cán bộ, giảng viên trong lễ phục chụp ảnh lưu niệm trong khuôn viên Học viện",
      hint: "/anh-khoa/anh-tap-the.jpg",
    },
    {
      src: "/anh-khoa/khai-giang-dang-vien-moi.jpg",
      alt: "Đại biểu và học viên chụp ảnh lưu niệm tại Lễ khai giảng lớp bồi dưỡng lý luận chính trị cho đảng viên mới năm học 2025–2026",
      hint: "/anh-khoa/khai-giang-dang-vien-moi.jpg",
    },
    {
      src: "/anh-khoa/khai-giang-hoi-truong.jpg",
      alt: "Quang cảnh hội trường Lễ khai giảng lớp bồi dưỡng lý luận chính trị cho đảng viên mới",
      hint: "/anh-khoa/khai-giang-hoi-truong.jpg",
    },
  ],
};

export const hero = {
  overline: "Khoa LLCT&KHXHNV · Học viện An ninh nhân dân",
  titleStart: "Học lý luận chính trị",
  titleAccent: "đúng nguồn, đúng trang",
  lead: "Học theo lộ trình, ôn theo chương, hỏi trợ lý và nhận câu trả lời kèm trang giáo trình.",
  askPlaceholder: "Hỏi một câu về giáo trình…",
  askButton: "Hỏi trợ lý",
  suggestLabel: "Thử hỏi",
  links: [
    { href: "/mon", label: "Bắt đầu học" },
    { href: "/thu-vien", label: "Vào thư viện" },
  ],
  /** Hỏi đáp mẫu nổi trên ảnh hero. Định nghĩa lấy từ thẻ t3-03 (content/ktct/the-ghi-nho/chuong-3.yaml). */
  demo: {
    question: "Giá trị thặng dư là gì?",
    answer: "Bộ phận giá trị mới dôi ra ngoài giá trị sức lao động do công nhân tạo ra, là kết quả của lao động không công cho nhà tư bản.",
    source: "Giáo trình KTCT",
    page: 53,
  },
};

/** Lưới lối vào nhanh ngay dưới hero. */
export const quickLinks = [
  { href: "/mon", title: "Bài học các môn", text: "Lộ trình học theo từng chương, kèm giáo trình, tài liệu, bài viết và câu hỏi gợi ý." },
  { href: "/thu-vien", title: "Thư viện tài liệu", text: "Giáo trình, văn kiện, tài liệu tham khảo đọc trực tuyến hoặc tải về." },
  { href: "/bai-viet", title: "Bài viết", text: "Hướng dẫn và bài ôn tập do giảng viên Khoa biên soạn." },
  { href: "/tro-ly", title: "Trợ lý học tập", text: "Hỏi đáp, giải bài tập, liên hệ thực tiễn và ôn thi, có trích nguồn." },
];

export const latestPosts = {
  overline: "Bài viết",
  title: "Bài viết mới từ giảng viên",
  more: "Tất cả bài viết",
};

export const about = {
  overline: "Giới thiệu",
  title: "Ứng dụng chuyển đổi số trong dạy và học lý luận chính trị",
  paragraphs: [
    "Hưởng ứng yêu cầu chuyển đổi số trong giáo dục, đào tạo, Khoa LLCT&KHXHNV xây dựng TheoryOJ, " +
      "trang học tập trực tuyến cho các môn lý luận chính trị: thư viện tài liệu, bài học theo chương, bài viết của giảng viên và trợ lý học tập ứng dụng trí tuệ nhân tạo.",
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
  title: "Hỏi là có nguồn, đến từng trang",
  lead: "Trợ lý chỉ trả lời từ tài liệu trong Thư viện. Học viên chọn chế độ phù hợp; mỗi ý trong câu trả lời đều dẫn về trang gốc để đối chiếu.",
  bullets: {
    qa: ["Dùng đúng thuật ngữ của giáo trình", "Bấm vào nguồn để xem đoạn gốc"],
    exercise: ["Bốn bước: dữ kiện, công thức, tính, kết luận", "Báo rõ khi đề thiếu dữ kiện"],
    practice: ["Căn cứ nghị quyết của Đảng", "Liên hệ nhiệm vụ bảo vệ an ninh kinh tế"],
    review: ["Câu hỏi tự luận theo từng chương", "Chỉ ra ý còn thiếu so với giáo trình"],
  } satisfies Record<ModeId, string[]>,
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
  overline: "Khoa LLCT&KHXHNV",
  title: "Đồng hành cùng học viên",
  lead: "Nội dung của trợ lý do giảng viên Khoa biên soạn, kiểm định và cập nhật theo chương trình đào tạo của Học viện.",
};

/** Phần "Về Khoa" ở trang giới thiệu. Khoa rà soát lời văn và điền số liệu. */
export const faculty = {
  overline: "Về Khoa",
  nameStart: "Khoa Lý luận chính trị",
  nameAccent: "và Khoa học xã hội nhân văn",
  paragraphs: [
    "Khoa LLCT&KHXHNV là đơn vị chuyên môn của Học viện An ninh nhân dân, đảm nhiệm giảng dạy các môn lý luận chính trị " +
      "và khoa học xã hội nhân văn cho học viên các hệ đào tạo.",
    "Bên cạnh giảng dạy, Khoa tổ chức nghiên cứu khoa học, các sân chơi học thuật như Cuộc thi học tập song ngữ “Đường đến triết học”, " +
      "và đẩy mạnh chuyển đổi số trong dạy và học. TheoryOJ là một sản phẩm của hướng đi đó.",
  ],
  duties: [
    { title: "Giảng dạy", text: "Các môn lý luận chính trị theo chương trình đào tạo của Học viện." },
    { title: "Nghiên cứu khoa học", text: "Đề tài, bài viết gắn lý luận với thực tiễn bảo vệ an ninh quốc gia." },
    { title: "Giáo dục chính trị tư tưởng", text: "Bồi dưỡng bản lĩnh chính trị, phẩm chất người cán bộ Công an nhân dân." },
  ],
  photoCaption: "Tập thể cán bộ, giảng viên trong khuôn viên Học viện",
  subjectsLabel: "môn lý luận chính trị do Khoa đảm nhiệm",
  // Số môn lấy từ config/subjects.ts. Các ô còn lại Khoa điền, ví dụ "40+"; ô để trống không hiển thị.
  stats: [
    { value: "", label: "Giảng viên" },
    { value: "", label: "Bộ môn" },
    { value: "", label: "Năm xây dựng và phát triển" },
  ],
};

/**
 * Nhóm thực hiện ở trang giới thiệu, theo thứ tự hiển thị (Bùi Thị Liên ở giữa). Ảnh chân dung khổ dọc đặt ở `apps/web/public/thanh-vien/`,
 * khung hiển thị 3:4 cắt bớt phần trên và dưới ảnh.
 */
export interface Member {
  name: string;
  /** Trung đội của học viên, hoặc đơn vị công tác của giảng viên. */
  unit: string;
  photo: Photo;
}

const member = (name: string, unit: string, file: string): Member => ({
  name,
  unit,
  photo: { src: `/thanh-vien/${file}.jpg`, alt: `Ảnh chân dung ${name}`, hint: `/thanh-vien/${file}.jpg` },
});

export const team: { title: string; members: Member[] } = {
  title: "Nhóm thực hiện",
  members: [
    member("Phạm Hoàng Minh Châu", "Trung đội B10D57", "pham-hoang-minh-chau"),
    member("Phạm Xuân Long", "Trung đội B8D55", "pham-xuan-long"),
    member("Bùi Thị Liên", "Khoa LLCT&KHXHNV", "bui-thi-lien"),
    member("Bùi Hoàng Minh", "Trung đội B15D57", "bui-hoang-minh"),
    member("Đỗ Hồng Nhất", "Trung đội B9D55", "do-hong-nhat"),
  ],
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
      a: "Trong giai đoạn thử nghiệm, trợ lý dành cho học viên có tài khoản do Học viện cấp. Trang giới thiệu và bài học theo chương được công khai.",
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
  title: "Bắt đầu ôn tập ngay hôm nay",
  text: "Chọn môn, chọn chương, đặt câu hỏi và đối chiếu câu trả lời với giáo trình.",
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
        { label: "Bài học các môn", href: "/mon" },
        { label: "Thư viện tài liệu", href: "/thu-vien" },
        { label: "Bài viết", href: "/bai-viet" },
        { label: "Giới thiệu", href: "/gioi-thieu" },
        { label: "Câu hỏi thường gặp", href: "/gioi-thieu#hoi-dap" },
        { label: "Ôn tập và tiến độ", href: "/tien-do" },
        { label: "Khảo sát ý kiến", href: "/khao-sat" },
      ],
    },
  ],
  disclaimer:
    "Câu trả lời do trí tuệ nhân tạo tạo ra từ tài liệu chính thống và có thể chưa chính xác. Đồng chí cần đối chiếu với giáo trình và hỏi giảng viên khi cần.",
};

/** Khung chat minh họa ở trang chủ. Đoạn trả lời lấy nguyên ý giáo trình KTCT, trang in 59. */
export const assistantDemo = {
  question: "Tỷ suất giá trị thặng dư phản ánh điều gì?",
  answer:
    "Tỷ suất giá trị thặng dư là tỷ lệ phần trăm giữa giá trị thặng dư và tư bản khả biến để sản xuất ra giá trị thặng dư đó.",
  formula: "m' = m / v × 100 %",
  source: "Giáo trình KTCT · chương 3, tr. 59",
};
