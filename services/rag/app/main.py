"""Dịch vụ tìm kiếm TheoryOJ. Không lưu thông tin người dùng hay hội thoại.

    uvicorn app.main:app --port 8001          # chạy trong services/rag
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

from .api import health, ingest, search
from .retrieval import embedder, openrouter, reranker, store
from .settings import get_settings


def _warm_up():
    s = get_settings()
    store.pool()
    if s.embed_provider == "local":
        embedder.model()
    if s.rerank_enabled and s.rerank_provider == "local":
        reranker.model()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nạp mô hình trước để câu hỏi đầu tiên không phải chờ. Đặt RAG_LAZY=1 khi phát triển.
    if os.getenv("RAG_LAZY") != "1":
        await run_in_threadpool(_warm_up)
    yield
    store.close()
    openrouter.close()


app = FastAPI(title="TheoryOJ RAG", version="0.1.0", lifespan=lifespan)
app.include_router(health.router)
app.include_router(search.router)
app.include_router(ingest.router)
