import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversations, feedback, messages } from "@/lib/db/schema";

import type { ModeId } from "../modes";
import type { ChatMessage, Citation, Label, RefusalReason } from "../types";
import type { Timings } from "./pipeline";

// Bước 7 của PLAN.md mục 3: lưu câu hỏi, câu trả lời, trích dẫn để mở lại hội thoại và để giảng viên xem nhật ký.

const TITLE_MAX = 80;

export const textOfParts = (parts: ChatMessage["parts"]) =>
  parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();

/**
 * Tạo hội thoại nếu chưa có. Trả về false nếu id đã thuộc về trình duyệt khác, khi đó route trả 404.
 */
export async function ensureConversation(id: string, visitorId: string, subject: string, firstQuestion: string) {
  const title = firstQuestion.length > TITLE_MAX ? `${firstQuestion.slice(0, TITLE_MAX - 1)}…` : firstQuestion;
  await db.insert(conversations).values({ id, visitorId, subject, title }).onConflictDoNothing();
  const [row] = await db.select({ visitorId: conversations.visitorId }).from(conversations).where(eq(conversations.id, id));
  return row?.visitorId === visitorId;
}

/** Lưu câu hỏi. Khi người hỏi bấm "Thử lại", client gửi lại đúng tin nhắn cũ nên bỏ qua nếu đã có. */
export async function saveUserMessage(conversationId: string, id: string, text: string) {
  await db
    .insert(messages)
    .values({ id, conversationId, role: "user", content: text, parts: [{ type: "text", text }] })
    .onConflictDoNothing();
}

export interface AssistantRecord {
  id: string;
  conversationId: string;
  parts: ChatMessage["parts"];
  question: string;
  mode: ModeId;
  chapters?: number[];
  label: Label | null;
  refused: RefusalReason | null;
  flagged: boolean;
  rewrittenQuery: string | null;
  maxScore: number | null;
  citations: Citation[];
  latencyMs: number;
  timings: Timings | null;
  incomplete: boolean;
}

export async function saveAssistantMessage(r: AssistantRecord) {
  await db.insert(messages).values({
    id: r.id,
    conversationId: r.conversationId,
    role: "assistant",
    content: textOfParts(r.parts),
    parts: r.parts,
    question: r.question,
    mode: r.mode,
    chapters: r.chapters?.length ? r.chapters : null,
    label: r.label,
    refused: r.refused,
    flagged: r.flagged,
    rewrittenQuery: r.rewrittenQuery,
    maxScore: r.maxScore,
    citations: r.citations,
    latencyMs: r.latencyMs,
    timings: r.timings,
    incomplete: r.incomplete,
  }).onConflictDoNothing();
  await db.update(conversations).set({ updatedAt: sql`now()` }).where(eq(conversations.id, r.conversationId));
}

export interface ConversationSummary {
  id: string;
  title: string;
  subject: string;
  updatedAt: Date;
}

export async function listConversations(visitorId: string, limit = 50): Promise<ConversationSummary[]> {
  return db
    .select({ id: conversations.id, title: conversations.title, subject: conversations.subject, updatedAt: conversations.updatedAt })
    .from(conversations)
    .where(eq(conversations.visitorId, visitorId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

export interface LoadedConversation {
  id: string;
  subject: string;
  title: string;
  messages: ChatMessage[];
  /** Đánh giá đã gửi từ trình duyệt này, theo id tin nhắn. */
  feedback: Record<string, 1 | -1>;
  /** Chế độ và chương của lượt cuối, để mở lại đúng ngữ cảnh. */
  lastMode: ModeId | null;
  lastChapters: number[];
}

export async function loadConversation(id: string, visitorId: string): Promise<LoadedConversation | null> {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.visitorId, visitorId)));
  if (!conv) return null;

  const rows = await db
    .select({ id: messages.id, role: messages.role, parts: messages.parts, mode: messages.mode, chapters: messages.chapters })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  const ids = rows.filter((r) => r.role === "assistant").map((r) => r.id);
  const ratings = ids.length
    ? await db
        .select({ messageId: feedback.messageId, rating: feedback.rating })
        .from(feedback)
        .where(and(inArray(feedback.messageId, ids), eq(feedback.visitorId, visitorId)))
    : [];
  const last = rows.findLast((r) => r.role === "assistant");

  return {
    id: conv.id,
    subject: conv.subject,
    title: conv.title,
    messages: rows.map((r) => ({ id: r.id, role: r.role, parts: r.parts as ChatMessage["parts"] })),
    feedback: Object.fromEntries(ratings.map((f) => [f.messageId, f.rating === 1 ? 1 : -1])),
    lastMode: (last?.mode as ModeId | undefined) ?? null,
    lastChapters: last?.chapters ?? [],
  };
}

export async function deleteConversation(id: string, visitorId: string) {
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.visitorId, visitorId)));
}

/** Ghi hoặc cập nhật đánh giá. Chỉ đánh giá được câu trả lời trong hội thoại của chính mình. */
export async function upsertFeedback(input: {
  messageId: string;
  visitorId: string;
  rating: 1 | -1;
  reason: string | null;
  comment: string | null;
}): Promise<boolean> {
  const [owned] = await db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(messages.id, input.messageId), eq(messages.role, "assistant"), eq(conversations.visitorId, input.visitorId)));
  if (!owned) return false;
  await db
    .insert(feedback)
    .values(input)
    .onConflictDoUpdate({
      target: [feedback.messageId, feedback.visitorId],
      set: { rating: input.rating, reason: input.reason, comment: input.comment, createdAt: sql`now()` },
    });
  return true;
}
