/** Danh sách môn và chương. Ranh giới trang của từng chương nằm trong content/<môn>/manifest.yaml. */

export interface Chapter {
  number: number;
  title: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  active: boolean;
  chapters: Chapter[];
}

export const SUBJECTS: Subject[] = [
  {
    id: "ktct",
    name: "Kinh tế chính trị Mác – Lênin",
    shortName: "KTCT",
    active: true,
    chapters: [
      { number: 1, title: "Đối tượng, phương pháp nghiên cứu và chức năng của kinh tế chính trị Mác – Lênin" },
      { number: 2, title: "Hàng hóa, thị trường và vai trò của các chủ thể tham gia thị trường" },
      { number: 3, title: "Giá trị thặng dư trong nền kinh tế thị trường" },
      { number: 4, title: "Cạnh tranh và độc quyền trong nền kinh tế thị trường" },
      { number: 5, title: "Kinh tế thị trường định hướng xã hội chủ nghĩa và các quan hệ lợi ích kinh tế ở Việt Nam" },
      { number: 6, title: "Công nghiệp hóa, hiện đại hóa và hội nhập kinh tế quốc tế của Việt Nam" },
    ],
  },
  { id: "triet", name: "Triết học Mác – Lênin", shortName: "Triết học", active: false, chapters: [] },
  { id: "cnxhkh", name: "Chủ nghĩa xã hội khoa học", shortName: "CNXHKH", active: false, chapters: [] },
  { id: "tthcm", name: "Tư tưởng Hồ Chí Minh", shortName: "TT HCM", active: false, chapters: [] },
  { id: "lsd", name: "Lịch sử Đảng Cộng sản Việt Nam", shortName: "Lịch sử Đảng", active: false, chapters: [] },
];

export const DEFAULT_SUBJECT = "ktct";

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
