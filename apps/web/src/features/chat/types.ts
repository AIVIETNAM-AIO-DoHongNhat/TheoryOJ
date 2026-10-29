import type { InferUITools, UIMessage } from "ai";

import type { ktctCalculator } from "./tools/ktct-calculator";

export const LABELS = ["hop_le", "ngoai_pham_vi", "khieu_khich", "chen_lenh"] as const;
export type Label = (typeof LABELS)[number];

/** Lý do từ chối: một trong ba nhãn bị chặn, hoặc điểm tìm kiếm dưới ngưỡng. */
export type RefusalReason = Exclude<Label, "hop_le"> | "thap_diem";

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
}

export type ChatMessage = UIMessage<
  never,
  {
    status: ChatStatus;
    citations: Citation[];
  },
  InferUITools<{ tinh_ktct: typeof ktctCalculator }>
>;
