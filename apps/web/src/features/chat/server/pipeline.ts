import { isStepCount, type ModelMessage } from "ai";

import { env } from "@/lib/env";
import { chatModel, fastModel } from "@/lib/llm";
import { search } from "@/lib/rag-client";

import { MODES, type ModeId } from "../modes";
import { ktctCalculator } from "../tools/ktct-calculator";
import type { Citation, Label, RefusalReason } from "../types";
import { buildUserMessage, toCitations } from "./build-context";
import { classify } from "./guardrails";
import { FLAGGED, systemPrompt } from "./prompts";
import { rewriteQuery, type Turn } from "./rewrite-query";

export interface ChatInput {
  subject: string;
  mode: ModeId;
  chapters?: number[];
  history: Turn[];
  question: string;
}

export interface Timings {
  rewriteMs: number;
  classifyMs: number;
  searchMs: number;
}

export type Decision =
  | { type: "refuse"; reason: RefusalReason; label: Label; flagged: boolean; query: string; maxScore: number | null; citations: Citation[]; timings: Timings }
  | { type: "answer"; label: Label; query: string; maxScore: number; citations: Citation[]; timings: Timings };

const since = (t0: number) => Math.round(performance.now() - t0);

/** Bước 2–5 của PLAN.md mục 3: viết lại câu hỏi, phân loại, tìm kiếm, so ngưỡng. */
export async function prepare(input: ChatInput, abortSignal?: AbortSignal): Promise<Decision> {
  const mode = MODES[input.mode];
  const timings: Timings = { rewriteMs: 0, classifyMs: 0, searchMs: 0 };

  let t0 = performance.now();
  const query = await rewriteQuery(fastModel, input.history, input.question, abortSignal);
  timings.rewriteMs = since(t0);

  // Phân loại và tìm kiếm chạy song song; kết quả tìm kiếm bị bỏ nếu câu hỏi bị chặn.
  t0 = performance.now();
  const [classification, result] = await Promise.all([
    classify(fastModel, input.question, query, abortSignal).finally(() => (timings.classifyMs = since(t0))),
    search(
      { query, subject: input.subject, chapters: input.chapters?.length ? input.chapters : undefined, kinds: mode.kinds, top_k: mode.topK },
      abortSignal,
    ).finally(() => (timings.searchMs = since(t0))),
  ]);

  const { label } = classification;
  const citations = toCitations(result.hits);
  if (label !== "hop_le") {
    return { type: "refuse", reason: label, label, flagged: FLAGGED.has(label), query, maxScore: result.max_score, citations: [], timings };
  }
  if (mode.applyThreshold && result.max_score < env.REFUSAL_THRESHOLD) {
    return { type: "refuse", reason: "thap_diem", label, flagged: false, query, maxScore: result.max_score, citations, timings };
  }
  return { type: "answer", label, query, maxScore: result.max_score, citations, timings };
}

const MAX_HISTORY = 6;

/** Bỏ dấu trích dẫn [n] của các lượt trước, vì số thứ tự đó chỉ đúng với tài liệu của lượt ấy. */
function stripCitations(text: string): string {
  return text.replace(/\[\d+\](?!\()/g, "");
}

/** Tham số cho streamText (route) hoặc generateText (đánh giá) ở bước 6. */
export function answerSettings(input: ChatInput, citations: Citation[]) {
  const mode = MODES[input.mode];
  const messages: ModelMessage[] = [
    ...input.history.slice(-MAX_HISTORY).map((t) => ({ role: t.role, content: stripCitations(t.text) }) as ModelMessage),
    { role: "user", content: buildUserMessage(citations, input.question) },
  ];
  return {
    model: chatModel,
    instructions: systemPrompt(input.mode),
    messages,
    temperature: 0.2,
    maxOutputTokens: 1500,
    ...(mode.calculator
      ? {
          tools: { tinh_ktct: ktctCalculator },
          stopWhen: isStepCount(4),
          // Bắt buộc gọi công cụ ở bước đầu để mô hình không tự tính nhẩm.
          prepareStep: ({ stepNumber }: { stepNumber: number }) =>
            stepNumber === 0 ? { toolChoice: { type: "tool" as const, toolName: "tinh_ktct" as const } } : {},
        }
      : {}),
  };
}
