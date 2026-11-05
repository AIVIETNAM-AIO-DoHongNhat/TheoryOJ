"""Cấu hình dịch vụ tìm kiếm, đọc từ biến môi trường hoặc file .env ở gốc repo."""
from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]
# Trong container mã nằm ở /srv/app nên không có thư mục "gốc repo"; lúc đó cấu hình đến từ biến môi trường.
REPO_ROOT = SERVICE_DIR.parents[1] if len(SERVICE_DIR.parents) > 1 else SERVICE_DIR


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(REPO_ROOT / ".env", SERVICE_DIR / ".env"),
                                      env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://theoryoj:theoryoj@127.0.0.1:5433/theoryoj"
    content_dir: Path = REPO_ROOT / "content"

    # "local": chạy mô hình bằng sentence-transformers trên máy (cần cài extra `local`).
    # "openrouter": gọi API của OpenRouter, dịch vụ không tải mô hình nào.
    embed_provider: str = "local"
    rerank_provider: str = "local"
    embed_model: str = "BAAI/bge-m3"          # với openrouter: "baai/bge-m3"
    embed_dim: int = 1024
    rerank_model: str = "BAAI/bge-reranker-v2-m3"   # với openrouter: ví dụ "cohere/rerank-v3.5"
    rerank_enabled: bool = True

    # Dùng chung khóa với mô hình ngôn ngữ của web (LLM_API_KEY) nếu không đặt OPENROUTER_API_KEY riêng.
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_api_key: str | None = Field(default=None, validation_alias=AliasChoices("OPENROUTER_API_KEY", "LLM_API_KEY"))
    remote_timeout_s: float = 60.0
    embed_batch: int = 32                      # số đoạn mỗi lần gọi API embedding
    device: str | None = None          # None: tự chọn cuda nếu có, không thì cpu
    max_seq_length: int = 512

    chunk_size: int = 1000             # số ký tự mỗi đoạn
    chunk_overlap: int = 200           # số ký tự chồng lấn giữa hai đoạn liền nhau
    min_chunk_chars: int = 50          # bỏ đoạn rác (số trang, tiêu đề lẻ)

    candidates: int = 30               # số đoạn lấy từ mỗi nhánh vector và từ khóa
    rerank_candidates: int = 20        # số đoạn sau RRF đưa vào reranker
    rrf_k: int = 60

    rag_api_key: str | None = None     # nếu đặt, /ingest yêu cầu header X-API-Key


@lru_cache
def get_settings() -> Settings:
    return Settings()
