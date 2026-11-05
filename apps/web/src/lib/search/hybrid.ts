import "server-only";

import { type SQL, sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { embedQuery, rerank } from "./openrouter";
import { lexicalQuery, normalizeQuery, rrf } from "./query";
import { type Hit, RagError, type SearchRequest, type SearchResponse } from "./types";

// Khớp services/rag/app/settings.py.
const CANDIDATES = 30;
const RERANK_CANDIDATES = 20;
const RRF_K = 60;
const SUBJECT_PATTERN = /^[a-z0-9_-]{1,32}$/;

type Row = {
  id: string;
  text: string;
  chapter: number | null;
  pdf_page: number | null;
  page: number | null;
  section: string | null;
  kind: string;
  document: string;
  document_title: string;
  vector_score?: number;
  lexical_score?: number;
};

const COLUMNS = sql`c.id::text AS id, c.text, c.chapter, c.pdf_page, c.page, c.section, c.kind,
  d.path AS document, d.title AS document_title`;

/** Không chỉ định `kinds` thì chỉ tìm trong chỉ mục chính; tài liệu `index: separate` (niên giám) chỉ tìm khi nêu đích danh loại. */
function where(req: SearchRequest): SQL {
  const parts: SQL[] = [sql`c.subject = ${req.subject}`];
  if (req.kinds?.length) parts.push(sql`c.kind IN (${sql.join(req.kinds.map((k) => sql`${k}`), sql`, `)})`);
  else parts.push(sql`c.index_name = 'main'`);
  if (req.chapters?.length) parts.push(sql`c.chapter IN (${sql.join(req.chapters.map((n) => sql`${Math.trunc(n)}`), sql`, `)})`);
  return sql.join(parts, sql` AND `);
}

async function vectorSearch(vec: number[], req: SearchRequest): Promise<Row[]> {
  const lit = `[${vec.join(",")}]`;
  return [
    ...(await db.execute<Row>(sql`
      SELECT ${COLUMNS}, 1 - (c.embedding <=> q.v) AS vector_score
      FROM chunks c JOIN documents d ON d.id = c.document_id, (SELECT ${lit}::vector AS v) q
      WHERE ${where(req)} ORDER BY c.embedding <=> q.v LIMIT ${CANDIDATES}`)),
  ];
}

async function lexicalSearch(query: string, req: SearchRequest): Promise<Row[]> {
  const tsq = lexicalQuery(query);
  if (tsq === null) return [];
  return [
    ...(await db.execute<Row>(sql`
      SELECT ${COLUMNS}, ts_rank_cd(c.tsv, q) AS lexical_score
      FROM chunks c JOIN documents d ON d.id = c.document_id, to_tsquery('simple', ${tsq}) q
      WHERE ${where(req)} AND c.tsv @@ q
      ORDER BY lexical_score DESC LIMIT ${CANDIDATES}`)),
  ];
}

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/** Tìm kết hợp vector + từ khóa, gộp bằng RRF, xếp hạng lại bằng reranker. Cùng thuật toán với services/rag. */
export async function searchInProcess(req: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
  if (!SUBJECT_PATTERN.test(req.subject)) throw new RagError("Mã môn không hợp lệ");
  const query = normalizeQuery(req.query);
  if (!query) throw new RagError("Câu hỏi rỗng");
  const topK = Math.min(Math.max(req.top_k ?? 5, 1), 20);

  try {
    // Tìm từ khóa không cần vector nên chạy song song với việc gọi API embedding.
    const sparsePromise = lexicalSearch(query, req);
    const dense = await embedQuery(query, signal).then((vec) => vectorSearch(vec, req));
    const fused = rrf([dense, await sparsePromise], RRF_K);

    const pool = fused.slice(0, RERANK_CANDIDATES);
    if (pool.length === 0) return { hits: [], max_score: 0, mode: "hybrid_rerank" };
    const scores = await rerank(query, pool.map((h) => h.text), signal);
    const hits: Hit[] = pool
      .map((h, i) => ({ h, score: scores[i] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ h, score }) => ({
        text: h.text,
        document: h.document,
        document_title: h.document_title,
        kind: h.kind,
        chapter: h.chapter,
        page: h.page,
        pdf_page: h.pdf_page,
        section: h.section,
        score: round4(score),
        vector_score: h.vector_score == null ? null : round4(h.vector_score),
      }));
    return { hits, max_score: Math.max(0, ...hits.map((h) => h.score)), mode: "hybrid_rerank" };
  } catch (err) {
    if (err instanceof RagError || signal?.aborted) throw err;
    throw new RagError("Tìm kiếm thất bại", { cause: err });
  }
}
