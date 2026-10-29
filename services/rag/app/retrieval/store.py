"""Bảng `documents`, `chunks` trong PostgreSQL + pgvector.

Dịch vụ rag sở hữu hai bảng này và tự tạo khi khởi động. Next.js chỉ đọc (danh sách nguồn,
hiển thị trích dẫn). Chưa tạo chỉ mục HNSW: với vài nghìn đoạn, quét toàn bộ mất vài mili giây
và cho kết quả chính xác, kể cả khi có bộ lọc chương, loại tài liệu.
"""
import atexit
import re
from contextlib import contextmanager
from dataclasses import dataclass

import psycopg
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from ..settings import get_settings

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id           serial PRIMARY KEY,
    subject      text NOT NULL,
    path         text NOT NULL,
    title        text NOT NULL,
    kind         text NOT NULL,
    index_name   text NOT NULL DEFAULT 'main',
    cite_by      text NOT NULL DEFAULT 'page',
    page_offset  integer NOT NULL DEFAULT 0,
    related_chapters integer[] NOT NULL DEFAULT '{{}}',
    sha256       text NOT NULL,
    meta_hash    text NOT NULL,
    chunk_count  integer NOT NULL DEFAULT 0,
    ingested_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (subject, path)
);

CREATE TABLE IF NOT EXISTS chunks (
    id          bigserial PRIMARY KEY,
    document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    subject     text NOT NULL,
    kind        text NOT NULL,
    index_name  text NOT NULL,
    chapter     integer,
    pdf_page    integer,
    page        integer,
    section     text,
    ord         integer NOT NULL,
    text        text NOT NULL,
    embedding   vector({dim}) NOT NULL,
    tsv         tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED
);

CREATE INDEX IF NOT EXISTS chunks_filter_idx ON chunks (subject, index_name, kind, chapter);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv);
"""

_pool: ConnectionPool | None = None


def _configure(conn):
    register_vector(conn)


def pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        s = get_settings()
        with psycopg.connect(s.database_url, autocommit=True) as conn:
            conn.execute(SCHEMA.format(dim=s.embed_dim))
        _pool = ConnectionPool(s.database_url, min_size=1, max_size=5, configure=_configure,
                               kwargs={"row_factory": dict_row}, open=True)
        atexit.register(close)
    return _pool


@contextmanager
def connection():
    with pool().connection() as conn:
        yield conn


def close():
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


# ---------- Bộ lọc ----------

@dataclass
class Filters:
    subject: str
    chapters: list[int] | None = None
    kinds: list[str] | None = None

    def sql(self) -> tuple[str, list]:
        """Không chỉ định `kinds` thì chỉ tìm trong chỉ mục chính. Tài liệu `index: separate`
        (niên giám) chỉ được tìm khi `kinds` nêu đích danh loại của nó."""
        where, params = ["c.subject = %s"], [self.subject]
        if self.kinds:
            where.append("c.kind = ANY(%s)")
            params.append(self.kinds)
        else:
            where.append("c.index_name = 'main'")
        if self.chapters:
            where.append("c.chapter = ANY(%s)")
            params.append(self.chapters)
        return " AND ".join(where), params


_COLUMNS = """c.id, c.text, c.chapter, c.pdf_page, c.page, c.section, c.kind,
              d.path AS document, d.title AS document_title, d.cite_by"""


def vector_search(conn, embedding, f: Filters, limit: int) -> list[dict]:
    where, params = f.sql()
    return conn.execute(
        f"""SELECT {_COLUMNS}, 1 - (c.embedding <=> %s::vector) AS vector_score
            FROM chunks c JOIN documents d ON d.id = c.document_id
            WHERE {where} ORDER BY c.embedding <=> %s::vector LIMIT %s""",
        [embedding, *params, embedding, limit]).fetchall()


_TOKEN = re.compile(r"\w+", re.UNICODE)


def lexical_query(query: str) -> str | None:
    """Biểu thức tsquery cho tìm từ khóa.

    Từ tiếng Việt thường gồm nhiều âm tiết ("giá trị thặng dư") mà cấu hình 'simple' của
    PostgreSQL tách theo âm tiết. Ghép từng cặp âm tiết liền nhau bằng toán tử <-> giữ lại
    trật tự từ, và cặp âm tiết hiếm hơn hẳn âm tiết đơn ("là", "của"), nên không cần danh
    sách từ dừng. Các cặp nối bằng OR để câu hỏi dài vẫn khớp được một phần.
    """
    tokens = [t.lower() for t in _TOKEN.findall(query)]
    if not tokens:
        return None
    if len(tokens) == 1:
        return tokens[0]
    pairs = dict.fromkeys(f"{a} <-> {b}" for a, b in zip(tokens, tokens[1:]))
    return " | ".join(pairs)


def lexical_search(conn, query: str, f: Filters, limit: int) -> list[dict]:
    tsq = lexical_query(query)
    if tsq is None:
        return []
    where, params = f.sql()
    return conn.execute(
        f"""SELECT {_COLUMNS}, ts_rank_cd(c.tsv, q) AS lexical_score
            FROM chunks c JOIN documents d ON d.id = c.document_id,
                 to_tsquery('simple', %s) q
            WHERE {where} AND c.tsv @@ q
            ORDER BY lexical_score DESC LIMIT %s""",
        [tsq, *params, limit]).fetchall()


def count_chunks(conn, subject: str | None = None) -> dict[str, int]:
    rows = conn.execute(
        "SELECT index_name, count(*) AS n FROM chunks WHERE %s::text IS NULL OR subject = %s GROUP BY index_name",
        [subject, subject]).fetchall()
    return {r["index_name"]: r["n"] for r in rows}
