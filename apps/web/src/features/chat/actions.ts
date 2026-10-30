"use server";

import { z } from "zod";

import { getVisitorId } from "@/lib/visitor";

import { FEEDBACK_REASONS } from "./feedback";
import { deleteConversation, listConversations, upsertFeedback, type ConversationSummary } from "./server/persist";

// Mỗi action tự đọc mã khách trong cookie, không tin dữ liệu client gửi lên.

export async function listMyConversations(): Promise<ConversationSummary[]> {
  const visitorId = await getVisitorId();
  if (!visitorId) return [];
  return listConversations(visitorId);
}

export async function deleteMyConversation(id: string): Promise<void> {
  const visitorId = await getVisitorId();
  if (!visitorId || typeof id !== "string") return;
  await deleteConversation(id, visitorId);
}

const feedbackSchema = z.object({
  messageId: z.string().min(1).max(100),
  rating: z.union([z.literal(1), z.literal(-1)]),
  reason: z.enum(FEEDBACK_REASONS).nullable(),
  comment: z.string().trim().max(1000).nullable(),
});

export async function sendFeedback(input: z.input<typeof feedbackSchema>): Promise<{ ok: boolean }> {
  const visitorId = await getVisitorId();
  const parsed = feedbackSchema.safeParse(input);
  if (!visitorId || !parsed.success) return { ok: false };
  const { messageId, rating, reason, comment } = parsed.data;
  const ok = await upsertFeedback({
    messageId,
    visitorId,
    rating,
    reason: rating === -1 ? reason : null,
    comment: rating === -1 ? comment || null : null,
  });
  return { ok };
}
