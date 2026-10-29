import threading

from ..settings import get_settings

_lock = threading.Lock()
_model = None


def _device():
    s = get_settings()
    if s.device:
        return s.device
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"


def model():
    global _model
    with _lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer
            s = get_settings()
            _model = SentenceTransformer(s.embed_model, device=_device())
            _model.max_seq_length = s.max_seq_length
    return _model


def is_loaded() -> bool:
    return _model is not None


def _prefix(texts: list[str], kind: str) -> list[str]:
    # Mô hình họ e5 cần tiền tố "query:"/"passage:", bge-m3 thì không.
    if "e5" in get_settings().embed_model:
        return [f"{kind}: {t}" for t in texts]
    return texts


def embed(texts: list[str], kind: str = "passage", batch_size: int = 16) -> list[list[float]]:
    vecs = model().encode(_prefix(texts, kind), batch_size=batch_size, normalize_embeddings=True,
                          show_progress_bar=len(texts) > 50)
    return vecs.tolist()
