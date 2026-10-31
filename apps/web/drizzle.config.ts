import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

if (existsSync("../../.env")) process.loadEnvFile("../../.env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://theoryoj:theoryoj@127.0.0.1:5433/theoryoj" },
  // Chỉ quản lý bảng của Next.js; documents, chunks thuộc services/rag.
  tablesFilter: ["conversations", "messages", "feedback", "chat_rate_limits", "practice_attempts"],
});
