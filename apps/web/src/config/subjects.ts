/**
 * Danh sách môn và chương. Ranh giới trang của từng chương nằm trong content/<môn>/manifest.yaml.
 * Mở thêm môn: thêm học liệu vào content/<môn>/, điền chương ở đây, đặt `active: true` (PLAN.md mục 8, giai đoạn 6).
 */
import type { ModeId } from "@/features/chat/modes";

export interface Chapter {
  number: number;
  title: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  /** Một câu giới thiệu môn, hiện ở thẻ môn học. */
  description: string;
  active: boolean;
  /** Chế độ trợ lý dùng được với môn này. Giải bài tập chỉ có ở môn có công cụ tính. */
  modes: ModeId[];
  chapters: Chapter[];
}

const THEORY_MODES: ModeId[] = ["qa", "practice", "review"];

export const SUBJECTS: Subject[] = [
  {
    id: "ktct",
    name: "Kinh tế chính trị Mác – Lênin",
    shortName: "KTCT",
    description: "Hàng hóa, giá trị thặng dư, cạnh tranh và độc quyền, kinh tế thị trường định hướng xã hội chủ nghĩa.",
    active: true,
    modes: ["qa", "exercise", "practice", "review"],
    chapters: [
      { number: 1, title: "Đối tượng, phương pháp nghiên cứu và chức năng của kinh tế chính trị Mác – Lênin" },
      { number: 2, title: "Hàng hóa, thị trường và vai trò của các chủ thể tham gia thị trường" },
      { number: 3, title: "Giá trị thặng dư trong nền kinh tế thị trường" },
      { number: 4, title: "Cạnh tranh và độc quyền trong nền kinh tế thị trường" },
      { number: 5, title: "Kinh tế thị trường định hướng xã hội chủ nghĩa và các quan hệ lợi ích kinh tế ở Việt Nam" },
      { number: 6, title: "Công nghiệp hóa, hiện đại hóa và hội nhập kinh tế quốc tế của Việt Nam" },
    ],
  },
  {
    id: "triet",
    name: "Triết học Mác – Lênin",
    shortName: "Triết học",
    description: "Chủ nghĩa duy vật biện chứng và chủ nghĩa duy vật lịch sử.",
    active: false,
    modes: THEORY_MODES,
    chapters: [],
  },
  {
    id: "cnxhkh",
    name: "Chủ nghĩa xã hội khoa học",
    shortName: "CNXHKH",
    description: "Sứ mệnh lịch sử của giai cấp công nhân và thời kỳ quá độ lên chủ nghĩa xã hội.",
    active: false,
    modes: THEORY_MODES,
    chapters: [],
  },
  {
    id: "tthcm",
    name: "Tư tưởng Hồ Chí Minh",
    shortName: "TT HCM",
    description: "Hệ thống quan điểm của Chủ tịch Hồ Chí Minh về cách mạng Việt Nam.",
    active: false,
    modes: THEORY_MODES,
    chapters: [],
  },
  {
    id: "lsd",
    name: "Lịch sử Đảng Cộng sản Việt Nam",
    shortName: "Lịch sử Đảng",
    description: "Quá trình Đảng lãnh đạo cách mạng Việt Nam qua các thời kỳ.",
    active: false,
    modes: THEORY_MODES,
    chapters: [],
  },
];

export const ACTIVE_SUBJECTS = SUBJECTS.filter((s) => s.active);

/** Môn mở sẵn khi không có ?mon= trên đường dẫn. */
export const DEFAULT_SUBJECT = ACTIVE_SUBJECTS[0].id;

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
