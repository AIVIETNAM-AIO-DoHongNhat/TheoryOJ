import type { Kind } from "@/lib/rag-client";

/** Bốn chế độ ở PLAN.md mục 4.1. File này dùng được ở cả client và server. */
export const MODE_IDS = ["qa", "exercise", "practice", "review"] as const;
export type ModeId = (typeof MODE_IDS)[number];

export interface Mode {
  id: ModeId;
  label: string;
  description: string;
  placeholder: string;
  /** Nguồn tìm kiếm, theo thứ tự ưu tiên. */
  kinds: Kind[];
  topK: number;
  /** Chế độ Ôn thi không chặn theo ngưỡng điểm, vì tin nhắn thường là dàn ý trả lời chứ không phải câu hỏi. */
  applyThreshold: boolean;
  calculator: boolean;
}

export const MODES: Record<ModeId, Mode> = {
  qa: {
    id: "qa",
    label: "Hỏi đáp lý thuyết",
    description: "Trả lời ngắn gọn, trích nguồn sau mỗi ý",
    placeholder: "Ví dụ: Tỷ suất giá trị thặng dư là gì?",
    kinds: ["giao_trinh"],
    topK: 5,
    applyThreshold: true,
    calculator: false,
  },
  exercise: {
    id: "exercise",
    label: "Hướng dẫn giải bài tập",
    description: "Giải từng bước, phép tính do hệ thống thực hiện",
    placeholder: "Dán đề bài, ví dụ: c = 600, v = 200, m' = 200 %. Tính W và p'.",
    kinds: ["giao_trinh"],
    topK: 5,
    applyThreshold: true,
    calculator: true,
  },
  practice: {
    id: "practice",
    label: "Liên hệ thực tiễn",
    description: "Nối lý thuyết với văn kiện và nhiệm vụ của lực lượng CAND",
    placeholder: "Ví dụ: Nghị quyết 68 phát triển lý luận về kinh tế tư nhân thế nào?",
    kinds: ["van_kien", "cand", "tham_khao", "giao_trinh"],
    topK: 6,
    applyThreshold: true,
    calculator: false,
  },
  review: {
    id: "review",
    label: "Ôn thi",
    description: "Đặt câu hỏi theo chương và nhận xét dàn ý trả lời",
    placeholder: "Ví dụ: Hãy hỏi tôi một câu về chương 3.",
    kinds: ["giao_trinh"],
    topK: 5,
    applyThreshold: false,
    calculator: false,
  },
};
