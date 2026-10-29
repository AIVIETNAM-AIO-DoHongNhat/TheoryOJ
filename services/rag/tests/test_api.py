"""Kiểm tra lớp HTTP mà không cần cơ sở dữ liệu hay mô hình."""
import pytest
from fastapi.testclient import TestClient

from app.settings import get_settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("RAG_LAZY", "1")
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.mark.parametrize("body", [
    {"query": "", "subject": "ktct"},
    {"query": "x" * 2001, "subject": "ktct"},
    {"query": "giá trị", "subject": "../etc"},
    {"query": "giá trị", "subject": "ktct", "top_k": 100},
    {"query": "giá trị", "subject": "ktct", "kinds": ["bi_mat"]},
])
def test_search_rejects_invalid_input(client, body):
    assert client.post("/search", json=body).status_code == 422


def test_ingest_requires_api_key_when_configured(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "rag_api_key", "secret")
    assert client.post("/ingest", json={"subject": "ktct"}).status_code == 401
    assert client.post("/ingest", json={"subject": "ktct"}, headers={"X-API-Key": "wrong"}).status_code == 401


def test_ingest_unknown_subject_is_404(client, monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "content_dir", tmp_path)
    monkeypatch.setattr(get_settings(), "rag_api_key", None)
    assert client.post("/ingest", json={"subject": "khong-co"}).status_code == 404
