import { z } from "zod";

import { env } from "./env";

// Khớp với services/rag/app/schemas.py.
export const KINDS = ["giao_trinh", "van_kien", "tham_khao", "cand", "so_lieu"] as const;
export type Kind = (typeof KINDS)[number];

const hitSchema = z.object({
  text: z.string(),
  document: z.string(),
  document_title: z.string(),
  kind: z.string(),
  chapter: z.number().nullable(),
  page: z.number().nullable(),
  pdf_page: z.number().nullable(),
  section: z.string().nullable(),
  score: z.number(),
  vector_score: z.number().nullish(),
});

const responseSchema = z.object({
  hits: z.array(hitSchema),
  max_score: z.number(),
  mode: z.string(),
});

export type Hit = z.infer<typeof hitSchema>;
export type SearchResponse = z.infer<typeof responseSchema>;

export interface SearchRequest {
  query: string;
  subject: string;
  chapters?: number[];
  kinds?: Kind[];
  top_k?: number;
}

export class RagError extends Error {}

export async function search(req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  const timeout = AbortSignal.timeout(env.RAG_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${env.RAG_URL}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ top_k: 5, ...req }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: "no-store",
    });
  } catch (err) {
    throw new RagError(`Không gọi được dịch vụ tìm kiếm tại ${env.RAG_URL}`, { cause: err });
  }
  if (!res.ok) throw new RagError(`Dịch vụ tìm kiếm trả lỗi ${res.status}: ${await res.text()}`);
  return responseSchema.parse(await res.json());
}
