import { env } from "./env";
import { searchInProcess } from "./search/hybrid";
import { RagError, type SearchRequest, type SearchResponse, responseSchema } from "./search/types";

export { type Hit, KINDS, type Kind, RagError, type SearchRequest, type SearchResponse } from "./search/types";

/**
 * Tìm kiếm trong học liệu. Đặt RAG_URL thì gọi dịch vụ services/rag qua HTTP (Docker Compose);
 * không đặt thì tìm ngay trong tiến trình Next.js (Vercel): embedding và rerank gọi OpenRouter,
 * truy vấn vector và từ khóa chạy thẳng trên cùng PostgreSQL.
 */
export async function search(req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  const timeout = AbortSignal.timeout(env.RAG_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  if (!env.RAG_URL) return searchInProcess({ top_k: 5, ...req }, combined);

  let res: Response;
  try {
    res = await fetch(`${env.RAG_URL}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ top_k: 5, ...req }),
      signal: combined,
      cache: "no-store",
    });
  } catch (err) {
    throw new RagError(`Không gọi được dịch vụ tìm kiếm tại ${env.RAG_URL}`, { cause: err });
  }
  if (!res.ok) throw new RagError(`Dịch vụ tìm kiếm trả lỗi ${res.status}: ${await res.text()}`);
  return responseSchema.parse(await res.json());
}
