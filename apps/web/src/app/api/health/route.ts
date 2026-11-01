import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Docker healthcheck và giám sát: kiểm tra cơ sở dữ liệu và dịch vụ tìm kiếm. Không lộ chi tiết lỗi ra ngoài. */
export async function GET() {
  await connection();
  const [database, rag] = await Promise.all([
    db.execute(sql`select 1`).then(() => true, () => false),
    fetch(`${env.RAG_URL}/health`, { signal: AbortSignal.timeout(3_000) }).then((r) => r.ok, () => false),
  ]);
  const ok = database && rag;
  return Response.json({ ok, database, rag }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
