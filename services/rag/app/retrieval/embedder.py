import threading

import numpy as np

from ..settings import get_settings
from . import openrouter

_lock = threading.Lock()
_model = None


def _remote() -> bool:
    return get_settings().embed_provider == "openrouter"


def _device():
    s = get_settings()
    if s.device:
        return s.device
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"


def model():
    """Mô hình chạy trên máy. Không dùng khi embed_provider=openrouter."""
    global _model
    with _lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer
            s = get_settings()
            _model = SentenceTransformer(s.embed_model, device=_device())
            _model.max_seq_length = s.max_seq_length
    return _model


def is_loaded() -> bool:
    return True if _remote() else _model is not None


def _prefix(texts: list[str], kind: str) -> list[str]:
    # Mô hình họ e5 cần tiền tố "query:"/"passage:", bge-m3 thì không.
    if "e5" in get_settings().embed_model:
        return [f"{kind}: {t}" for t in texts]
    return texts


def _embed_remote(texts: list[str]) -> list[list[float]]:
    s = get_settings()
    out: list[list[float]] = []
    for i in range(0, len(texts), s.embed_batch):
        out.extend(openrouter.embeddings(s.embed_model, texts[i:i + s.embed_batch]))
    arr = np.asarray(out, dtype=np.float32)
    if arr.size and arr.shape[1] != s.embed_dim:
        raise ValueError(f"Mô hình {s.embed_model} trả vector {arr.shape[1]} chiều, chỉ mục cần {s.embed_dim}")
    # Chuẩn hóa như bản chạy trên máy (normalize_embeddings=True) để điểm cosine so sánh được.
    arr /= np.maximum(np.linalg.norm(arr, axis=1, keepdims=True), 1e-12)
    return arr.tolist()


def embed(texts: list[str], kind: str = "passage", batch_size: int = 16) -> list[list[float]]:
    texts = _prefix(texts, kind)
    if _remote():
        return _embed_remote(texts)
    vecs = model().encode(texts, batch_size=batch_size, normalize_embeddings=True,
                          show_progress_bar=len(texts) > 50)
    return vecs.tolist()
