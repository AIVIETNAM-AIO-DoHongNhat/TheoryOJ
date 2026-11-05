import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

// Khi phát triển, dùng chung file .env ở gốc repo với services/rag. Biến đã có trong môi trường được giữ nguyên.
const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const schema = z.object({
  LLM_BASE_URL: z.url().default("http://localhost:11434/v1"),
  LLM_API_KEY: z.string().default("ollama"),
  LLM_MODEL: z.string().default("qwen2.5:7b"),
  /** Mô hình cho bước phân loại và viết lại câu hỏi. Mặc định dùng LLM_MODEL. */
  LLM_FAST_MODEL: z.string().optional(),
  /** Địa chỉ dịch vụ services/rag. Bỏ trống thì tìm kiếm chạy ngay trong Next.js (triển khai Vercel). */
  RAG_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  RAG_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  /** Tìm kiếm trong tiến trình (không có RAG_URL): embedding và rerank qua OpenRouter, dùng chung LLM_API_KEY nếu không đặt riêng. */
  OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  EMBED_MODEL: z.string().default("baai/bge-m3"),
  RERANK_MODEL: z.string().default("cohere/rerank-v3.5"),
  /** Ngưỡng điểm reranker. Dưới ngưỡng thì trả câu từ chối cố định (PLAN.md mục 2.4). */
  REFUSAL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.44),
  /** Cùng cơ sở dữ liệu với services/rag. Next.js sở hữu bảng hội thoại và đánh giá. */
  DATABASE_URL: z.string().default("postgresql://theoryoj:theoryoj@127.0.0.1:5433/theoryoj"),
  /** Số câu hỏi tối đa mỗi trình duyệt trong 10 phút và trong một ngày, mỗi IP trong 10 phút. */
  CHAT_LIMIT_VISITOR_10M: z.coerce.number().int().positive().default(20),
  CHAT_LIMIT_VISITOR_DAY: z.coerce.number().int().positive().default(200),
  CHAT_LIMIT_IP_10M: z.coerce.number().int().positive().default(120),
  /** Đợt khảo sát đang mở ở /khao-sat: "truoc" khi bắt đầu thử nghiệm, "sau" khi kết thúc, "dong" để đóng. */
  SURVEY_PHASE: z.enum(["truoc", "sau", "dong"]).default("truoc"),
});

export const env = schema.parse(process.env);
