-- Chạy một lần khi tạo volume Postgres.
-- Bảng documents, chunks do services/rag tự tạo (app/retrieval/store.py).
-- Bảng người dùng, hội thoại do Next.js tạo bằng Drizzle ở giai đoạn 2.
CREATE EXTENSION IF NOT EXISTS vector;
