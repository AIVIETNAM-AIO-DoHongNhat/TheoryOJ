import threading

from ..settings import get_settings
from .embedder import _device

_lock = threading.Lock()
_model = None


def model():
    global _model
    with _lock:
        if _model is None:
            from sentence_transformers import CrossEncoder
            s = get_settings()
            _model = CrossEncoder(s.rerank_model, device=_device(), max_length=s.max_seq_length)
    return _model


def is_loaded() -> bool:
    return _model is not None


def rerank(query: str, texts: list[str]) -> list[float]:
    """Điểm liên quan trong khoảng 0–1 (sigmoid của logit) cho từng cặp (câu hỏi, đoạn)."""
    if not texts:
        return []
    import torch
    scores = model().predict([(query, t) for t in texts], batch_size=8,
                             activation_fn=torch.nn.Sigmoid(), show_progress_bar=False)
    return [float(x) for x in scores]
