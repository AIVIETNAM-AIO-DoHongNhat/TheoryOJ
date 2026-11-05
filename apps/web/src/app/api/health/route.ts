import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Docker healthcheck và giám sát: kiểm tra cơ sở dữ liệu và tìm kiếm. Có RAG_URL thì hỏi dịch vụ rag; không thì
 * tìm kiếm chạy trong Next.js, chỉ cần có khóa OpenRouter và bảng chunks có dữ liệu. Không lộ chi tiết lỗi ra ngoài.
 */
export async function GET() {
  await connection();
  const [database, rag] = await Promise.all([
    db.execute(sql`select 1`).then(() => true, () => false),
    env.RAG_URL
      ? fetch(`${env.RAG_URL}/health`, { signal: AbortSignal.timeout(3_000) }).then((r) => r.ok, () => false)
      : Boolean(env.OPENROUTER_API_KEY ?? env.LLM_API_KEY) &&
        db.execute<{ n: number }>(sql`select count(*)::int as n from chunks`).then((r) => (r[0]?.n ?? 0) > 0, () => false),
  ]);
  const ok = database && rag;
  return Response.json({ ok, database, rag }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
