"""Tìm kết hợp: vector + từ khóa, gộp bằng Reciprocal Rank Fusion, xếp hạng lại bằng reranker."""
from dataclasses import dataclass

import numpy as np

from ..ingest.cleaning import normalize_query
from ..settings import get_settings
from . import embedder, reranker, store

MODES = ("vector", "hybrid", "hybrid_rerank")


@dataclass
class SearchResult:
    hits: list[dict]
    max_score: float
    mode: str


def rrf(rankings: list[list[dict]], k: int = 60) -> list[dict]:
    """Gộp nhiều danh sách đã xếp hạng. Mỗi đoạn nhận tổng 1 / (k + hạng) trên các danh sách."""
    merged: dict[int, dict] = {}
    for ranking in rankings:
        for rank, row in enumerate(ranking, start=1):
            item = merged.setdefault(row["id"], {**row, "rrf_score": 0.0})
            item.update({k_: v for k_, v in row.items() if k_ not in item})
            item["rrf_score"] += 1.0 / (k + rank)
    return sorted(merged.values(), key=lambda r: r["rrf_score"], reverse=True)


def search(query: str, filters: store.Filters, top_k: int = 5, mode: str = "hybrid_rerank") -> SearchResult:
    if mode not in MODES:
        raise ValueError(f"mode phải là một trong {MODES}")
    s = get_settings()
    if mode == "hybrid_rerank" and not s.rerank_enabled:
        mode = "hybrid"
    query = normalize_query(query)
    qvec = np.array(embedder.embed([query], kind="query")[0], dtype=np.float32)

    with store.connection() as conn:
        dense = store.vector_search(conn, qvec, filters, s.candidates)
        if mode == "vector":
            hits = dense[:top_k]
            for h in hits:
                h["score"] = h["vector_score"]
            return _result(hits, mode)
        sparse = store.lexical_search(conn, query, filters, s.candidates)

    fused = rrf([dense, sparse], k=s.rrf_k)
    if mode == "hybrid":
        hits = fused[:top_k]
        # Điểm RRF không có thang tuyệt đối, nên ngưỡng từ chối vẫn dựa vào điểm vector.
        for h in hits:
            h["score"] = h.get("vector_score") or 0.0
        return _result(hits, mode)

    pool = fused[:s.rerank_candidates]
    for h, score in zip(pool, reranker.rerank(query, [h["text"] for h in pool])):
        h["rerank_score"] = score
        h["score"] = score
    pool.sort(key=lambda h: h["score"], reverse=True)
    return _result(pool[:top_k], mode)


_PUBLIC = ("text", "document", "document_title", "kind", "chapter", "page", "pdf_page", "section",
           "score", "vector_score", "lexical_score", "rerank_score")


def _result(hits: list[dict], mode: str) -> SearchResult:
    out = []
    for h in hits:
        row = {k: h.get(k) for k in _PUBLIC}
        for k in ("score", "vector_score", "lexical_score", "rerank_score"):
            if row[k] is not None:
                row[k] = round(float(row[k]), 4)
        out.append(row)
    return SearchResult(hits=out, max_score=max((h["score"] for h in out), default=0.0), mode=mode)
