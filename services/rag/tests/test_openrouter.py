"""Lớp gọi API OpenRouter, thử bằng transport giả nên không cần mạng hay khóa thật."""
import httpx
import numpy as np
import pytest

from app.retrieval import embedder, openrouter, reranker
from app.settings import get_settings


@pytest.fixture
def fake(monkeypatch):
    """Cài một handler thay cho OpenRouter; trả về danh sách các request đã nhận."""
    s = get_settings()
    monkeypatch.setattr(s, "openrouter_api_key", "sk-or-test")
    monkeypatch.setattr(s, "embed_provider", "openrouter")
    monkeypatch.setattr(s, "rerank_provider", "openrouter")
    monkeypatch.setattr(s, "embed_model", "baai/bge-m3")
    monkeypatch.setattr(s, "rerank_model", "cohere/rerank-v3.5")
    monkeypatch.setattr(openrouter.time, "sleep", lambda _: None)
    calls: list[httpx.Request] = []

    def install(handler):
        def wrapped(request: httpx.Request) -> httpx.Response:
            calls.append(request)
            return handler(request)
        openrouter.close()
        monkeypatch.setattr(openrouter, "_client", httpx.Client(
            base_url="https://openrouter.test/api/v1", transport=httpx.MockTransport(wrapped),
            headers={"Authorization": "Bearer sk-or-test"}))
    yield install, calls
    openrouter._client = None


def _json(request):
    import json
    return json.loads(request.content)


def test_embed_batches_sorts_by_index_and_normalizes(fake, monkeypatch):
    install, calls = fake
    s = get_settings()
    monkeypatch.setattr(s, "embed_dim", 2)
    monkeypatch.setattr(s, "embed_batch", 2)

    def handler(req):
        texts = _json(req)["input"]
        # Cố ý trả lộn thứ tự: phải sắp lại theo "index".
        data = [{"object": "embedding", "index": i, "embedding": [3.0 * (i + 1), 4.0 * (i + 1)]}
                for i in reversed(range(len(texts)))]
        return httpx.Response(200, json={"object": "list", "model": "baai/bge-m3", "data": data})
    install(handler)

    vecs = embedder.embed(["a", "b", "c"])
    assert len(calls) == 2                                   # 3 đoạn, mỗi lần 2 → 2 lần gọi
    assert [len(_json(c)["input"]) for c in calls] == [2, 1]
    assert np.allclose(np.linalg.norm(vecs, axis=1), 1.0)
    assert np.allclose(vecs[0], [0.6, 0.8])


def test_embed_rejects_wrong_dimension(fake, monkeypatch):
    install, _ = fake
    monkeypatch.setattr(get_settings(), "embed_dim", 1024)
    install(lambda req: httpx.Response(200, json={"object": "list", "model": "m", "data": [
        {"object": "embedding", "index": 0, "embedding": [1.0, 2.0]}]}))
    with pytest.raises(ValueError, match="2 chiều"):
        embedder.embed(["a"])


def test_rerank_returns_scores_in_input_order(fake):
    install, calls = fake
    install(lambda req: httpx.Response(200, json={"model": "m", "results": [
        {"index": 2, "relevance_score": 0.9, "document": {"text": "c"}},
        {"index": 0, "relevance_score": 0.1, "document": {"text": "a"}},
        {"index": 1, "relevance_score": 0.5, "document": {"text": "b"}}]}))
    assert reranker.rerank("q", ["a", "b", "c"]) == [0.1, 0.5, 0.9]
    body = _json(calls[0])
    assert body["model"] == "cohere/rerank-v3.5" and body["query"] == "q" and body["documents"] == ["a", "b", "c"]


def test_rerank_missing_result_is_an_error(fake):
    install, _ = fake
    install(lambda req: httpx.Response(200, json={"model": "m", "results": [
        {"index": 0, "relevance_score": 0.1, "document": {"text": "a"}}]}))
    with pytest.raises(openrouter.OpenRouterError):
        reranker.rerank("q", ["a", "b"])


def test_retries_on_429_then_succeeds(fake):
    install, calls = fake
    answers = iter([httpx.Response(429, text="slow down"), httpx.Response(502, text="bad gateway"),
                    httpx.Response(200, json={"model": "m", "results": [
                        {"index": 0, "relevance_score": 0.7, "document": {"text": "a"}}]})])
    install(lambda req: next(answers))
    assert reranker.rerank("q", ["a"]) == [0.7]
    assert len(calls) == 3


def test_does_not_retry_client_errors(fake):
    install, calls = fake
    install(lambda req: httpx.Response(401, text="bad key"))
    with pytest.raises(openrouter.OpenRouterError, match="401"):
        reranker.rerank("q", ["a"])
    assert len(calls) == 1


def test_error_field_in_200_is_retried_then_raised(fake):
    install, calls = fake
    install(lambda req: httpx.Response(200, json={"error": {"message": "provider down"}}))
    with pytest.raises(openrouter.OpenRouterError, match="provider down"):
        reranker.rerank("q", ["a"])
    assert len(calls) == 5


def test_missing_key_is_a_clear_error(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "openrouter_api_key", None)
    monkeypatch.setattr(s, "rerank_provider", "openrouter")
    openrouter.close()
    with pytest.raises(openrouter.OpenRouterError, match="OPENROUTER_API_KEY"):
        reranker.rerank("q", ["a"])


def test_remote_providers_report_loaded_without_models(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "embed_provider", "openrouter")
    monkeypatch.setattr(s, "rerank_provider", "openrouter")
    assert embedder.is_loaded() and reranker.is_loaded()
