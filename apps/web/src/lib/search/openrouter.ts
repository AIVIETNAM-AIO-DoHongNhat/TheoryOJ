import { env } from "@/lib/env";

import { RagError } from "./types";

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200];

function apiKey(): string {
  const key = env.OPENROUTER_API_KEY ?? env.LLM_API_KEY;
  if (!key || key === "ollama") throw new RagError("Thiếu OPENROUTER_API_KEY (hoặc LLM_API_KEY) cho tìm kiếm trong Next.js");
  return key;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

/** POST JSON tới OpenRouter, thử lại tối đa hai lần khi bị giới hạn tần suất hoặc lỗi máy chủ. */
async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let last = "";
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(`${env.OPENROUTER_BASE_URL.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey()}`, "x-title": "TheoryOJ" },
        body: JSON.stringify(body),
        signal,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as T & { error?: unknown };
        // OpenRouter đôi khi trả 200 kèm "error" khi nhà cung cấp phía sau lỗi.
        if (!data.error) return data;
        last = JSON.stringify(data.error).slice(0, 300);
      } else {
        last = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
        if (!RETRY_STATUS.has(res.status)) throw new RagError(`${path} ${last}`);
      }
    } catch (err) {
      if (err instanceof RagError || signal?.aborted) throw err;
      last = err instanceof Error ? err.message : String(err);
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt], signal);
  }
  throw new RagError(`${path} thất bại sau ${RETRY_DELAYS_MS.length + 1} lần thử. ${last}`);
}

/** Vector đã chuẩn hóa L2, như bản Python (normalize_embeddings=True), nên điểm cosine so sánh được với chỉ mục. */
export async function embedQuery(text: string, signal?: AbortSignal): Promise<number[]> {
  const data = await post<{ data: { embedding: number[]; index?: number }[] }>(
    "/embeddings",
    { model: env.EMBED_MODEL, input: [text], encoding_format: "float" },
    signal,
  );
  const vec = data.data?.[0]?.embedding;
  if (!vec?.length) throw new RagError("/embeddings không trả vector");
  const norm = Math.hypot(...vec) || 1;
  return vec.map((x) => x / norm);
}

/** Điểm liên quan theo đúng thứ tự `documents`. Mỗi mô hình một thang điểm nên ngưỡng REFUSAL_THRESHOLD gắn với RERANK_MODEL. */
export async function rerank(query: string, documents: string[], signal?: AbortSignal): Promise<number[]> {
  const data = await post<{ results: { index: number; relevance_score: number }[] }>(
    "/rerank",
    { model: env.RERANK_MODEL, query, documents },
    signal,
  );
  const scores: (number | undefined)[] = Array.from({ length: documents.length });
  for (const r of data.results ?? []) scores[r.index] = r.relevance_score;
  if (scores.some((s) => s === undefined)) throw new RagError("/rerank không trả điểm cho mọi tài liệu");
  return scores as number[];
}
