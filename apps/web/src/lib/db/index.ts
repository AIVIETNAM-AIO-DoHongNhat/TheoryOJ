import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

// Giữ một kết nối qua các lần nạp lại module khi phát triển.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// Trên Vercel mỗi instance chỉ cần vài kết nối, vì Neon giới hạn tổng số kết nối. Địa chỉ pooler của Neon
// (có "-pooler" trong tên máy) chạy PgBouncer ở chế độ transaction nên không dùng được prepared statement.
const serverless = Boolean(process.env.VERCEL);
const client =
  globalForDb.pg ??
  postgres(env.DATABASE_URL, {
    max: serverless ? 3 : 10,
    idle_timeout: serverless ? 20 : undefined,
    prepare: !env.DATABASE_URL.includes("-pooler"),
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
