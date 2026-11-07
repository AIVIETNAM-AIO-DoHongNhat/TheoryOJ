import { isStepCount, type ModelMessage } from "ai";

import { getSubject, type Subject } from "@/config/subjects";
import { getProfile } from "@/features/learning/server/profile";
import { getLibrary } from "@/features/library/server/catalog";
import { env } from "@/lib/env";
import { chatModel, fastModel } from "@/lib/llm";
import { search } from "@/lib/rag-client";

import { MODES, type ModeId } from "../modes";
import { ktctCalculator } from "../tools/ktct-calculator";
import type { Citation, Grounding, Intent, Label, RefusalReason } from "../types";
import { buildUserMessage, sanitize, toCitations } from "./build-context";
import { classifierPrompt, FLAGGED, type RouterDocument, routerPrompt, smallTalkPrompt, summaryPrompt, type SummaryTarget, systemPrompt } from "./prompts";
import type { Turn } from "./rewrite-query";
import { route, type RouteContext, type Scope } from "./router";
import { prepareSummary } from "./summarize";

export interface ChatInput {
  subject: string;
  mode: ModeId;
  chapters?: number[];
  history: Turn[];
  question: string;
  /** Trích dẫn của câu trả lời gần nhất, đọc từ DB, cho yêu cầu "tóm tắt lại câu trả lời trên". */
  previousCitations?: Citation[];
}

export interface Timings {
  routeMs: number;
  searchMs: number;
  /** Tóm lược từng lô khi phạm vi tóm tắt quá dài. */
  condenseMs: number;
}

interface Common {
  label: Label;
  intent: Intent;
  /** Phạm vi tóm tắt bộ định tuyến nhận ra, để đo và ghi log. */
  scope: Scope | null;
  query: string;
  maxScore: number | null;
  citations: Citation[];
  timings: Timings;
}

export type Decision =
  | (Common & { type: "refuse"; reason: RefusalReason; flagged: boolean })
  | (Common & {
      type: "answer";
      /** qa: trả lời theo chế độ; summary: tóm tắt; chat: chào hỏi, không tìm kiếm. */
      kind: "qa" | "summary" | "chat";
      grounding: Grounding | null;
      summary?: SummaryTarget;
      draftSummary?: boolean;
    });

const since = (t0: number) => Math.round(performance.now() - t0);

/** Số đoạn lấy về khi tóm tắt theo chủ đề: nhiều hơn hỏi đáp để đủ các ý. */
const TOPIC_SUMMARY_TOP_K = 10;
/** Văn kiện và tài liệu tóm tắt được: bỏ niên giám (quá dài, chỉ để tra số liệu). */
const SUMMARIZABLE_KINDS = new Set(["giao_trinh", "van_kien", "tham_khao", "cand"]);

function routerDocuments(subjectId: string): RouterDocument[] {
  return getLibrary()
    .filter((d) => d.subject === subjectId && d.kind !== "giao_trinh" && SUMMARIZABLE_KINDS.has(d.kind))
    .map((d) => ({ code: d.file, title: d.title }));
}

/**
 * Mức căn cứ của câu trả lời theo điểm tìm kiếm. Chỉ cho trả lời bằng kiến thức chung khi nhãn hop_le
 * do mô hình gán (không phải nhãn mặc định khi bộ phân loại trả lời lạc đề) và khi CHAT_GENERAL_ANSWERS bật.
 * Trả null nghĩa là từ chối như trước.
 */
export function groundingFor(maxScore: number, applyThreshold: boolean, trusted: boolean): Grounding | null {
  if (!applyThreshold || maxScore >= env.REFUSAL_THRESHOLD) return "tai_lieu";
  if (!env.CHAT_GENERAL_ANSWERS || !trusted) return null;
  return maxScore >= env.GENERAL_FLOOR ? "mot_phan" : "kien_thuc_chung";
}

/** Bước 2–5 của PLAN.md mục 3: định tuyến (phân loại, ý định, viết lại câu hỏi), tìm kiếm, chọn mức căn cứ. */
export async function prepare(input: ChatInput, abortSignal?: AbortSignal): Promise<Decision> {
  const mode = MODES[input.mode];
  const subject = getSubject(input.subject)!;
  const profile = getProfile(subject.id);
  const documents = routerDocuments(subject.id);
  const ctx: RouteContext = { chapterNumbers: subject.chapters.map((c) => c.number), documents: documents.map((d) => d.code) };
  const timings: Timings = { routeMs: 0, searchMs: 0, condenseMs: 0 };

  let t0 = performance.now();
  const r = await route(
    fastModel,
    { router: routerPrompt(subject, profile, documents), classifier: classifierPrompt(subject, profile) },
    ctx,
    input.history,
    input.question,
    abortSignal,
  );
  timings.routeMs = since(t0);
  const base = { label: r.label, intent: r.intent, scope: r.scope, query: r.query, timings };

  if (r.label !== "hop_le") {
    return { ...base, type: "refuse", reason: r.label, flagged: FLAGGED.has(r.label), maxScore: null, citations: [] };
  }
  // Giải bài tập luôn đi đường hỏi đáp để bắt buộc gọi công cụ tính.
  const intent: Intent = mode.calculator ? "hoi_dap" : r.intent;
  if (intent === "tro_chuyen") {
    return { ...base, intent, type: "answer", kind: "chat", grounding: null, maxScore: null, citations: [] };
  }

  if (intent === "tom_tat" && r.scope?.kind === "hoi_thoai") {
    return {
      ...base, intent, type: "answer", kind: "summary", grounding: "tai_lieu", maxScore: null,
      citations: input.previousCitations ?? [], summary: { description: "cuộc trao đổi", conversation: true },
    };
  }

  const scope = r.scope;
  if (intent === "tom_tat" && (scope?.kind === "chuong" || scope?.kind === "trang" || scope?.kind === "van_kien")) {
    t0 = performance.now();
    const result = await prepareSummary(scope, subject, fastModel, abortSignal);
    timings.searchMs = since(t0);
    if (result && "tooLarge" in result) {
      return {
        ...base, intent, type: "answer", kind: "summary", grounding: null, maxScore: null, citations: [],
        summary: result.target,
      };
    }
    if (result) {
      timings.condenseMs = result.condenseMs;
      timings.searchMs -= result.condenseMs;
      return {
        ...base, intent, type: "answer", kind: "summary", grounding: "tai_lieu", maxScore: null,
        citations: result.citations, summary: result.target, draftSummary: result.draft,
      };
    }
    // Phạm vi không có đoạn nào (trang ngoài giáo trình...): tóm tắt theo chủ đề.
  }

  const summary = intent === "tom_tat";
  t0 = performance.now();
  const result = await search(
    {
      query: r.query,
      subject: input.subject,
      chapters: input.chapters?.length ? input.chapters : undefined,
      kinds: mode.kinds,
      top_k: summary ? TOPIC_SUMMARY_TOP_K : mode.topK,
    },
    abortSignal,
  );
  timings.searchMs = since(t0);
  const all = toCitations(result.hits, subject);

  const grounding = groundingFor(result.max_score, mode.applyThreshold, r.source === "model");
  if (!grounding) {
    return { ...base, intent, type: "refuse", reason: "thap_diem", flagged: false, maxScore: result.max_score, citations: all };
  }
  // Tài liệu không liên quan thì không đưa vào, tránh mô hình gán [n] cho đoạn lạc đề.
  const citations = grounding === "kien_thuc_chung" ? [] : all;
  return {
    ...base, intent, type: "answer", kind: summary ? "summary" : "qa", grounding, maxScore: result.max_score, citations,
    ...(summary ? { summary: { description: `chủ đề "${r.query}"` } } : {}),
  };
}

const MAX_HISTORY = 6;
/** Tóm tắt cuộc trao đổi cần xem nhiều lượt hơn. */
const MAX_HISTORY_SUMMARY = 12;

/** Bỏ dấu trích dẫn [n] của các lượt trước, vì số thứ tự đó chỉ đúng với tài liệu của lượt ấy. */
function stripCitations(text: string): string {
  return text.replace(/\[\d+\](?!\()/g, "");
}

type AnswerDecision = Extract<Decision, { type: "answer" }>;

/** Câu trả lời cố định, không gọi mô hình: phạm vi tóm tắt quá lớn. */
export function cannedAnswer(decision: AnswerDecision): string | null {
  if (decision.kind === "summary" && decision.grounding === null) {
    return `Phạm vi ${decision.summary?.description ?? "này"} quá dài để tóm tắt trong một lượt. Đồng chí vui lòng chọn một phần cụ thể hơn, ví dụ một chương hoặc một khoảng trang.`;
  }
  return null;
}

function historyMessages(history: Turn[], keepLastAssistantCitations: boolean): ModelMessage[] {
  const turns = history.slice(-(keepLastAssistantCitations ? MAX_HISTORY_SUMMARY : MAX_HISTORY));
  const lastAssistant = turns.findLastIndex((t) => t.role === "assistant");
  return turns.map((t, i) => ({
    role: t.role,
    content: keepLastAssistantCitations && i === lastAssistant ? t.text : stripCitations(t.text),
  }) as ModelMessage);
}

function instructionsFor(input: ChatInput, decision: AnswerDecision, subject: Subject): string {
  if (decision.kind === "chat") return smallTalkPrompt(subject);
  const grounding = decision.grounding ?? "tai_lieu";
  if (decision.kind === "summary") return summaryPrompt(subject, decision.summary ?? { description: "nội dung được hỏi" }, grounding);
  return systemPrompt(input.mode, subject, getProfile(subject.id), grounding);
}

/** Tham số cho streamText (route) hoặc generateText (đánh giá) ở bước 6. */
export function answerSettings(input: ChatInput, decision: AnswerDecision) {
  const mode = MODES[input.mode];
  const subject = getSubject(input.subject)!;
  const conversation = decision.kind === "summary" && !!decision.summary?.conversation;
  const user = decision.kind === "chat"
    ? `<cau_hoi>\n${sanitize(input.question)}\n</cau_hoi>`
    : buildUserMessage(decision.citations, input.question);
  const messages: ModelMessage[] = [
    ...(decision.kind === "chat" ? [] : historyMessages(input.history, conversation)),
    { role: "user", content: user },
  ];
  const maxOutputTokens = decision.kind === "chat" ? 300 : decision.kind === "summary" ? 3000 : 2000;
  return {
    model: chatModel,
    instructions: instructionsFor(input, decision, subject),
    messages,
    temperature: decision.kind === "chat" ? 0.5 : 0.2,
    maxOutputTokens,
    ...(mode.calculator && decision.kind === "qa"
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
