import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";

import { getSubject } from "@/config/subjects";
import { MODE_IDS } from "@/features/chat/modes";
import { answerSettings, prepare } from "@/features/chat/server/pipeline";
import { REFUSALS } from "@/features/chat/server/prompts";
import type { Turn } from "@/features/chat/server/rewrite-query";
import type { ChatMessage } from "@/features/chat/types";
import { RagError } from "@/lib/rag-client";

export const maxDuration = 60;

const MAX_QUESTION = 1500;

const bodySchema = z.object({
  subject: z.string().refine((s) => getSubject(s)?.active, "Môn học chưa mở"),
  mode: z.enum(MODE_IDS),
  chapters: z.array(z.number().int().min(1).max(20)).max(20).optional(),
  messages: z
    .array(
      z.object({
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

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Yêu cầu không hợp lệ", issues: parsed.error.issues }, { status: 400 });
  }
  const { subject, mode, chapters, messages } = parsed.data;
  if (!getSubject(subject)!.modes.includes(mode)) {
    return Response.json({ error: "Môn học này chưa hỗ trợ chế độ đã chọn" }, { status: 400 });
  }

  // Chỉ lấy phần chữ: không tin vai trò system hay phần công cụ do client gửi lên.
  const turns: Turn[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as Turn["role"], text: textOf(m.parts) }))
    .filter((t) => t.text);
  const last = turns.at(-1);
  if (!last || last.role !== "user") {
    return Response.json({ error: "Tin nhắn cuối phải là câu hỏi của học viên" }, { status: 400 });
  }
  if (last.text.length > MAX_QUESTION) {
    return Response.json({ error: `Câu hỏi dài quá ${MAX_QUESTION} ký tự` }, { status: 413 });
  }
  const input = { subject, mode, chapters, history: turns.slice(0, -1), question: last.text };
  const started = performance.now();

  const stream = createUIMessageStream<ChatMessage>({
    async execute({ writer }) {
      writer.write({ type: "start" });
      const decision = await prepare(input, req.signal);

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
        // Lưu và gắn cờ cho giảng viên được làm ở giai đoạn 3; trước mắt ghi vào log máy chủ.
        console.info(JSON.stringify({
          event: "chat.refused", reason: decision.reason, flagged: decision.flagged, mode,
          maxScore: decision.maxScore, question: input.question, timings: decision.timings,
        }));
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
        onEnd: () => {
          console.info(JSON.stringify({
            event: "chat.answered", mode, maxScore: decision.maxScore, query: decision.query,
            timings: decision.timings, totalMs: Math.round(performance.now() - started),
          }));
        },
      });
      writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
    },
    onError: (error) => {
      console.error(error);
      if (error instanceof RagError) return "Dịch vụ tìm kiếm tạm thời không phản hồi. Đồng chí vui lòng thử lại sau.";
      return "Trợ lý gặp lỗi khi trả lời. Đồng chí vui lòng thử lại sau.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
