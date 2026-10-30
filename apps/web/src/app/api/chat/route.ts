import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";

import { getSubject } from "@/config/subjects";
import { MODE_IDS } from "@/features/chat/modes";
import { ensureConversation, saveAssistantMessage, saveUserMessage, type AssistantRecord } from "@/features/chat/server/persist";
import { answerSettings, prepare } from "@/features/chat/server/pipeline";
import { REFUSALS } from "@/features/chat/server/prompts";
import type { Turn } from "@/features/chat/server/rewrite-query";
import type { ChatMessage } from "@/features/chat/types";
import { env } from "@/lib/env";
import { clientIp, hitRateLimits } from "@/lib/rate-limit";
import { RagError } from "@/lib/rag-client";
import { visitorFromRequest } from "@/lib/visitor";

export const maxDuration = 60;

const MAX_QUESTION = 1500;

const bodySchema = z.object({
  /** Id hội thoại do useChat sinh. */
  id: z.string().min(1).max(100),
  subject: z.string().refine((s) => getSubject(s)?.active, "Môn học chưa mở"),
  mode: z.enum(MODE_IDS),
  chapters: z.array(z.number().int().min(1).max(20)).max(20).optional(),
  messages: z
    .array(
      z.object({
        id: z.string().max(100),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })),
      }).loose(),
    )
    .min(1)
    .max(40),
});

function textOf(parts: { type: string; text?: string }[]): string {
  return parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("").trim();
}

/** Lỗi hiện thẳng cho người hỏi: useChat lấy nguyên văn nội dung phản hồi làm thông báo lỗi. */
const plain = (message: string, status: number, headers?: HeadersInit) => new Response(message, { status, headers });

export async function POST(req: Request) {
  // Không cần đăng nhập: mã khách trong cookie giữ lịch sử và giới hạn tần suất (lib/visitor.ts).
  const visitor = visitorFromRequest(req);
  const visitorId = visitor.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Yêu cầu không hợp lệ", issues: parsed.error.issues }, { status: 400 });
  }
  const { id: conversationId, subject, mode, chapters, messages } = parsed.data;
  if (!getSubject(subject)!.modes.includes(mode)) {
    return Response.json({ error: "Môn học này chưa hỗ trợ chế độ đã chọn" }, { status: 400 });
  }

  // Chỉ lấy phần chữ: không tin vai trò system hay phần công cụ do client gửi lên.
  const turns: Turn[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as Turn["role"], text: textOf(m.parts) }))
    .filter((t) => t.text);
  const last = turns.at(-1);
  const lastMessage = messages.at(-1)!;
  if (!last || last.role !== "user" || lastMessage.role !== "user") {
    return plain("Tin nhắn cuối phải là câu hỏi.", 400);
  }
  if (last.text.length > MAX_QUESTION) return plain(`Câu hỏi dài quá ${MAX_QUESTION} ký tự.`, 413);

  const wait = await hitRateLimits([
    { key: `v10:${visitorId}`, windowSec: 600, max: env.CHAT_LIMIT_VISITOR_10M },
    { key: `vday:${visitorId}`, windowSec: 86_400, max: env.CHAT_LIMIT_VISITOR_DAY },
    { key: `ip10:${clientIp(req.headers)}`, windowSec: 600, max: env.CHAT_LIMIT_IP_10M },
  ]);
  if (wait > 0) {
    const minutes = Math.max(1, Math.ceil(wait / 60));
    return plain(`Đồng chí đã hỏi quá số câu cho phép. Vui lòng thử lại sau khoảng ${minutes} phút.`, 429, {
      "Retry-After": String(wait),
    });
  }

  const firstQuestion = textOf(messages.find((m) => m.role === "user")!.parts);
  if (!(await ensureConversation(conversationId, visitorId, subject, firstQuestion))) {
    return plain("Không tìm thấy hội thoại.", 404);
  }
  await saveUserMessage(conversationId, lastMessage.id, last.text);

  const input = { subject, mode, chapters, history: turns.slice(0, -1), question: last.text };
  const started = performance.now();
  const assistantId = generateId();
  // Điền dần trong execute, lưu một lần ở onEnd (kể cả khi bị dừng giữa chừng).
  let record: Omit<AssistantRecord, "parts" | "latencyMs" | "incomplete"> | null = null;

  const stream = createUIMessageStream<ChatMessage>({
    async execute({ writer }) {
      writer.write({ type: "start", messageId: assistantId });
      const decision = await prepare(input, req.signal);
      record = {
        id: assistantId,
        conversationId,
        question: last.text,
        mode,
        chapters,
        label: decision.label,
        refused: decision.type === "refuse" ? decision.reason : null,
        flagged: decision.type === "refuse" && decision.flagged,
        rewrittenQuery: decision.query,
        maxScore: decision.maxScore,
        citations: decision.citations,
        timings: decision.timings,
      };

      writer.write({
        type: "data-status",
        data: {
          label: decision.label,
          refused: decision.type === "refuse" ? decision.reason : null,
          query: decision.query,
          maxScore: decision.maxScore,
        },
      });

      if (decision.type === "refuse") {
        const id = "refusal";
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: REFUSALS[decision.reason] });
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish" });
        return;
      }

      writer.write({ type: "data-citations", data: decision.citations });
      const result = streamText({
        ...answerSettings(input, decision.citations),
        abortSignal: req.signal,
      });
      writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
    },
    onEnd: async ({ messages: out, isAborted, outcome }) => {
      if (!record) return;
      const response = out.findLast((m) => m.role === "assistant");
      const totalMs = Math.round(performance.now() - started);
      console.info(JSON.stringify({
        event: record.refused ? "chat.refused" : "chat.answered", reason: record.refused, flagged: record.flagged,
        mode, maxScore: record.maxScore, timings: record.timings, totalMs,
      }));
      try {
        await saveAssistantMessage({
          ...record,
          parts: response?.parts ?? [],
          latencyMs: totalMs,
          incomplete: isAborted || outcome.status === "failed" || outcome.status === "aborted",
        });
      } catch (error) {
        console.error("Không lưu được câu trả lời", error);
      }
    },
    onError: (error) => {
      console.error(error);
      if (error instanceof RagError) return "Dịch vụ tìm kiếm tạm thời không phản hồi. Đồng chí vui lòng thử lại sau.";
      return "Trợ lý gặp lỗi khi trả lời. Đồng chí vui lòng thử lại sau.";
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: visitor.setCookie ? { "Set-Cookie": visitor.setCookie } : undefined,
  });
}
