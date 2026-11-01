import type { ModeId } from "@/features/chat/modes";

/** Câu hỏi gợi ý, bấm vào thì mở trợ lý với câu hỏi điền sẵn. Danh sách nằm trong content/<môn>/tro-ly.yaml. */
export interface Suggestion {
  mode: ModeId;
  text: string;
}
