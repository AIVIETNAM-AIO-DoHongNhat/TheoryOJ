import threading

from ..settings import get_settings
from . import openrouter

_lock = threading.Lock()
_model = None


def _remote() -> bool:
    return get_settings().rerank_provider == "openrouter"


def model():
    """Mô hình chạy trên máy. Không dùng khi rerank_provider=openrouter."""
    global _model
    with _lock:
        if _model is None:
            from sentence_transformers import CrossEncoder

            from .embedder import _device
            s = get_settings()
            _model = CrossEncoder(s.rerank_model, device=_device(), max_length=s.max_seq_length)
    return _model


def is_loaded() -> bool:
    return True if _remote() else _model is not None


def rerank(query: str, texts: list[str]) -> list[float]:
    """Điểm liên quan cho từng cặp (câu hỏi, đoạn). Bản local trả 0–1 (sigmoid của logit);
    bản openrouter trả điểm của mô hình đã chọn, thang điểm có thể khác nên cần đo lại REFUSAL_THRESHOLD."""
    if not texts:
        return []
    if _remote():
        return openrouter.rerank(get_settings().rerank_model, query, texts)
    import torch
    scores = model().predict([(query, t) for t in texts], batch_size=8,
                             activation_fn=torch.nn.Sigmoid(), show_progress_bar=False)
    return [float(x) for x in scores]
