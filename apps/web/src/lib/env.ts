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
  RAG_URL: z.url().default("http://127.0.0.1:8001"),
  RAG_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  /** Ngưỡng điểm reranker. Dưới ngưỡng thì trả câu từ chối cố định (PLAN.md mục 2.4). */
  REFUSAL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.3),
});

export const env = schema.parse(process.env);
