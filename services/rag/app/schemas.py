from typing import Literal

from pydantic import BaseModel, Field

Kind = Literal["giao_trinh", "van_kien", "tham_khao", "cand", "so_lieu"]
Mode = Literal["vector", "hybrid", "hybrid_rerank"]
SUBJECT_PATTERN = r"^[a-z0-9_-]{1,32}$"


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    subject: str = Field(pattern=SUBJECT_PATTERN)
    chapters: list[int] | None = Field(default=None, max_length=20)
    kinds: list[Kind] | None = None
    top_k: int = Field(default=5, ge=1, le=20)
    mode: Mode = "hybrid_rerank"


class Hit(BaseModel):
    text: str
    document: str
    document_title: str
    kind: str
    chapter: int | None
    page: int | None             # trang in, None với tài liệu trích theo mục
    pdf_page: int | None
    section: str | None
    score: float                 # rerank_score nếu có reranker, không thì vector_score
    vector_score: float | None = None
    lexical_score: float | None = None
    rerank_score: float | None = None


class SearchResponse(BaseModel):
    hits: list[Hit]
    max_score: float
    mode: Mode


class IngestRequest(BaseModel):
    subject: str = Field(pattern=SUBJECT_PATTERN)
    force: bool = False
    skip_separate: bool = False


class IngestFile(BaseModel):
    file: str
    status: Literal["added", "updated", "unchanged", "removed"]
    chunks: int


class IngestSkipped(BaseModel):
    file: str
    reason: str


class IngestResponse(BaseModel):
    subject: str
    files: list[IngestFile]
    skipped: list[IngestSkipped]
    total_chunks: int
