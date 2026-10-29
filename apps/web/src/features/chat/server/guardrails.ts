import { generateText, type LanguageModel } from "ai";

import { LABELS, type Label } from "../types";
import { CLASSIFIER_PROMPT } from "./prompts";

// Lớp chặn bằng luật, chạy trước mô hình: bắt các mẫu chèn lệnh rõ ràng mà không tốn một lệnh gọi.
const INJECTION_PATTERNS = [
  /(bỏ qua|quên|phớt lờ|bỏ hết)\s+(mọi|tất cả|các|toàn bộ|những)?\s*(hướng dẫn|chỉ dẫn|quy tắc|lệnh|yêu cầu)/i,
  /ignore\s+(all\s+|any\s+)?(previous|prior|above)?\s*(instructions|rules|prompts?)/i,
  /system\s*prompt|prompt\s+hệ\s+thống|developer\s+mode|jailbreak/i,
  /<\/?\s*(tai_lieu|cau_hoi|system)\b/i,
  /(^|\n)\s*tài liệu\s*:/i,
];

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

/** Lấy nhãn đầu tiên xuất hiện trong đầu ra của mô hình. Không đọc được thì trả null. */
export function parseLabel(output: string): Label | null {
  const text = output.toLowerCase().replace(/[\s-]+/g, "_");
  let best: { label: Label; at: number } | null = null;
  for (const label of LABELS) {
    const at = text.indexOf(label);
    if (at >= 0 && (!best || at < best.at)) best = { label, at };
  }
  return best?.label ?? null;
}

export interface Classification {
  label: Label;
  source: "rule" | "model" | "fallback";
  raw?: string;
}

export async function classify(
  model: LanguageModel,
  question: string,
  standalone: string,
  abortSignal?: AbortSignal,
): Promise<Classification> {
  if (detectInjection(question)) return { label: "chen_lenh", source: "rule" };

  const content = standalone === question
    ? question
    : `Tin nhắn: ${question}\nNghĩa đầy đủ theo ngữ cảnh: ${standalone}`;
  const { text } = await generateText({
    model,
    instructions: CLASSIFIER_PROMPT,
    prompt: `"""${content.replaceAll('"""', '"')}"""\nNhãn:`,
    temperature: 0,
    maxOutputTokens: 10,
    abortSignal,
  });
  const label = parseLabel(text);
  // Mô hình trả lời lạc đề thì cho qua: ngưỡng điểm ở bước tìm kiếm vẫn chặn câu ngoài phạm vi.
  return label ? { label, source: "model", raw: text } : { label: "hop_le", source: "fallback", raw: text };
}
