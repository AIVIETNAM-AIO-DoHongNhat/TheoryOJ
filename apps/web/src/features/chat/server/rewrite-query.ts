import { generateText, type LanguageModel } from "ai";

import { REWRITE_PROMPT } from "./prompts";

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

const MAX_TURNS = 4;
const MAX_CHARS = 600;

/** Viết lại câu hỏi nối tiếp thành câu độc lập để tìm kiếm. Câu hỏi đầu tiên không cần gọi mô hình. */
export async function rewriteQuery(
  model: LanguageModel,
  history: Turn[],
  question: string,
  abortSignal?: AbortSignal,
): Promise<string> {
  if (history.length === 0) return question;

  const transcript = history
    .slice(-MAX_TURNS)
    .map((t) => `${t.role === "user" ? "Học viên" : "Trợ lý"}: ${t.text.slice(0, MAX_CHARS)}`)
    .join("\n");
  const { text } = await generateText({
    model,
    instructions: REWRITE_PROMPT,
    prompt: `Hội thoại:\n${transcript}\n\nTin nhắn cuối: ${question}\n\nCâu truy vấn:`,
    temperature: 0,
    maxOutputTokens: 120,
    abortSignal,
  });
  const rewritten = text.trim().replace(/^["“']|["”']$/g, "").split("\n")[0].trim();
  return rewritten.length >= 3 && rewritten.length <= 500 ? rewritten : question;
}
