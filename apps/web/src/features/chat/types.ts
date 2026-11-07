import type { InferUITools, UIMessage } from "ai";

import type { ktctCalculator } from "./tools/ktct-calculator";

export const LABELS = ["hop_le", "ngoai_pham_vi", "khieu_khich", "chen_lenh"] as const;
export type Label = (typeof LABELS)[number];

/** Lý do từ chối: một trong ba nhãn bị chặn, hoặc điểm tìm kiếm dưới ngưỡng. */
export type RefusalReason = Exclude<Label, "hop_le"> | "thap_diem";

/** Ý định của tin nhắn: hỏi đáp (theo chế độ đang chọn), tóm tắt, hay chào hỏi xã giao. */
export const INTENTS = ["hoi_dap", "tom_tat", "tro_chuyen"] as const;
export type Intent = (typeof INTENTS)[number];

/**
 * Câu trả lời dựa vào đâu: `tai_lieu` chỉ dùng đoạn tìm được; `mot_phan` tài liệu chỉ liên quan một phần,
 * phần còn lại là kiến thức chung; `kien_thuc_chung` không có đoạn nào đủ liên quan.
 */
export const GROUNDINGS = ["tai_lieu", "mot_phan", "kien_thuc_chung"] as const;
export type Grounding = (typeof GROUNDINGS)[number];

export interface Citation {
  n: number;
  title: string;
  document: string;
  kind: string;
  chapter: number | null;
  page: number | null;
  /** Trang trong file PDF, để mở trình đọc ở thư viện. */
  pdfPage: number | null;
  section: string | null;
  text: string;
  score: number;
}

export interface ChatStatus {
  label: Label;
  refused: RefusalReason | null;
  query: string;
  maxScore: number | null;
  /** Không có ở tin nhắn lưu trước khi có bộ định tuyến. */
  intent?: Intent;
  grounding?: Grounding;
  /** Tóm tắt dựng từ bản sinh sẵn chưa được giảng viên duyệt. */
  draftSummary?: boolean;
}

export type ChatMessage = UIMessage<
  never,
  {
    status: ChatStatus;
    citations: Citation[];
  },
  InferUITools<{ tinh_ktct: typeof ktctCalculator }>
>;
