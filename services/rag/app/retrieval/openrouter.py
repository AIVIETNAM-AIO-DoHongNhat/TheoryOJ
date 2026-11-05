"""Máy khách mỏng cho API embedding và rerank của OpenRouter (https://openrouter.ai/api/v1)."""
import threading
import time

import httpx

from ..settings import get_settings

_RETRY_STATUS = {429, 500, 502, 503, 504}
_client: httpx.Client | None = None
_lock = threading.Lock()


class OpenRouterError(RuntimeError):
    pass


def _http() -> httpx.Client:
    global _client
    with _lock:
        if _client is None:
            s = get_settings()
            if not s.openrouter_api_key:
                raise OpenRouterError("Thiếu OPENROUTER_API_KEY (hoặc LLM_API_KEY) cho embed_provider/rerank_provider=openrouter")
            _client = httpx.Client(
                base_url=s.openrouter_base_url.rstrip("/"),
                timeout=s.remote_timeout_s,
                headers={"Authorization": f"Bearer {s.openrouter_api_key}", "X-Title": "TheoryOJ"},
            )
    return _client


def close():
    global _client
    with _lock:
        if _client is not None:
            _client.close()
            _client = None


def post(path: str, body: dict, retries: int = 4) -> dict:
    """POST JSON, thử lại khi bị giới hạn tần suất hoặc lỗi máy chủ (chờ 1, 2, 4, 8 giây)."""
    last = ""
    for attempt in range(retries + 1):
        try:
            r = _http().post(path, json=body)
        except httpx.TransportError as e:
            last = f"{type(e).__name__}: {e}"
        else:
            if r.status_code == 200:
                data = r.json()
                # OpenRouter đôi khi trả 200 kèm trường "error" khi nhà cung cấp phía sau lỗi.
                if isinstance(data, dict) and data.get("error"):
                    last = str(data["error"])[:300]
                else:
                    return data
            else:
                last = f"HTTP {r.status_code}: {r.text[:300]}"
                if r.status_code not in _RETRY_STATUS:
                    raise OpenRouterError(f"{path} {last}")
        if attempt < retries:
            time.sleep(2 ** attempt)
    raise OpenRouterError(f"{path} thất bại sau {retries + 1} lần thử. {last}")


def embeddings(model: str, texts: list[str]) -> list[list[float]]:
    data = post("/embeddings", {"model": model, "input": texts, "encoding_format": "float"})
    rows = sorted(data["data"], key=lambda d: d.get("index", 0))
    if len(rows) != len(texts):
        raise OpenRouterError(f"/embeddings trả {len(rows)} vector cho {len(texts)} đoạn")
    return [row["embedding"] for row in rows]


def rerank(model: str, query: str, documents: list[str]) -> list[float]:
    """Điểm theo đúng thứ tự `documents`."""
    data = post("/rerank", {"model": model, "query": query, "documents": documents})
    scores: list[float | None] = [None] * len(documents)
    for row in data["results"]:
        scores[row["index"]] = float(row["relevance_score"])
    if any(sc is None for sc in scores):
        raise OpenRouterError("/rerank không trả điểm cho mọi tài liệu")
    return scores  # type: ignore[return-value]
