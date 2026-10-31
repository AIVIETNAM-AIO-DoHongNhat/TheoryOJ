-- Chạy một lần khi tạo volume Postgres.
-- Bảng documents, chunks do services/rag tự tạo (app/retrieval/store.py).
-- Bảng hội thoại, đánh giá do Next.js tạo bằng Drizzle (apps/web: npm run db:migrate).
CREATE EXTENSION IF NOT EXISTS vector;
