from fastapi import APIRouter

from ..retrieval import embedder, reranker, store
from ..settings import get_settings

router = APIRouter()


@router.get("/health")
def health():
    s = get_settings()
    try:
        with store.connection() as conn:
            chunks = store.count_chunks(conn)
        db = "ok"
    except Exception as e:                      # báo lỗi thay vì trả 500 để giám sát đọc được
        chunks, db = {}, f"error: {type(e).__name__}"
    return {"status": "ok" if db == "ok" else "degraded", "db": db, "chunks": chunks,
            "embed_model": s.embed_model, "embed_loaded": embedder.is_loaded(),
            "rerank_model": s.rerank_model if s.rerank_enabled else None, "rerank_loaded": reranker.is_loaded()}
