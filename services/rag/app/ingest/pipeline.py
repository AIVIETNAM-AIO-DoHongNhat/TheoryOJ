"""Nạp tăng dần một môn học từ manifest vào PostgreSQL.

Tài liệu chỉ được nhúng lại khi mã băm nội dung file hoặc mã băm cấu hình (mục trong manifest,
tham số cắt đoạn, mô hình nhúng) thay đổi. Tài liệu bị xóa khỏi manifest thì bị xóa khỏi chỉ mục.
"""
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from ..retrieval import embedder, store
from ..settings import get_settings
from .chunking import chunk
from .metadata import DocumentSpec, load_manifest, sha256_file
from .readers import READERS

# Tăng số này khi đổi cách đọc, làm sạch hoặc cắt đoạn để buộc nạp lại toàn bộ.
PIPELINE_VERSION = 1

_IGNORED_DIRS = {"_goc"}            # file gốc đã được chuyển định dạng, xem converted_from
_IGNORED_FILES = {"manifest.yaml"}


@dataclass
class IngestReport:
    subject: str
    files: list[dict] = field(default_factory=list)
    skipped: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"subject": self.subject, "files": self.files, "skipped": self.skipped,
                "total_chunks": sum(f.get("chunks", 0) for f in self.files if f["status"] != "removed")}


@dataclass
class ChunkRow:
    chapter: int | None
    pdf_page: int | None
    page: int | None
    section: str | None
    text: str
    embed_text: str


def _short_title(doc: DocumentSpec) -> str:
    return doc.title.split(" (")[0] if len(doc.title) > 80 else doc.title


def build_chunks(doc: DocumentSpec, path: Path) -> list[ChunkRow]:
    s = get_settings()
    titles = {c.number: c.title for c in doc.chapters if c.title}
    rows = []
    for seg in READERS[path.suffix.lower()](path):
        if seg.pdf_page in doc.skip_pages:
            continue
        chapter = doc.chapter_of(seg.pdf_page)
        # Dòng ngữ cảnh chỉ đưa vào mô hình nhúng, không lưu vào text hiển thị cho người đọc.
        if seg.section:
            header = f"{_short_title(doc)} – {seg.section}"
        elif chapter in titles:
            header = f"Chương {chapter}. {titles[chapter]}"
        else:
            header = _short_title(doc)
        for text in chunk(seg.text, s.chunk_size, s.chunk_overlap):
            if len(text) < s.min_chunk_chars:
                continue
            rows.append(ChunkRow(chapter, seg.pdf_page, doc.printed_page(seg.pdf_page), seg.section,
                                 text, f"{header}\n{text}"))
    return rows


def _scan_unlisted(root: Path, listed: set[str]) -> list[dict]:
    out = []
    for f in sorted(root.rglob("*")):
        rel = f.relative_to(root).as_posix()
        if (not f.is_file() or f.name.startswith(".") or f.name in _IGNORED_FILES
                or rel.split("/")[0] in _IGNORED_DIRS or rel in listed):
            continue
        out.append({"file": rel, "reason": "không có trong manifest.yaml"})
    return out


def ingest_subject(subject: str, force: bool = False, skip_separate: bool = False,
                   log: Callable[[str], None] = print) -> IngestReport:
    s = get_settings()
    root = s.content_dir / subject
    if not (root / "manifest.yaml").exists():
        raise FileNotFoundError(f"Không thấy {root / 'manifest.yaml'}")
    manifest = load_manifest(root)
    report = IngestReport(subject)
    listed = {d.path for d in manifest.documents}
    report.skipped.extend(_scan_unlisted(root, listed))
    params = {"pipeline": PIPELINE_VERSION, "chunk_size": s.chunk_size, "chunk_overlap": s.chunk_overlap,
              "min_chunk_chars": s.min_chunk_chars, "embed_model": s.embed_model}

    with store.connection() as conn:
        existing = {r["path"]: r for r in conn.execute(
            "SELECT id, path, sha256, meta_hash, chunk_count FROM documents WHERE subject = %s",
            [subject]).fetchall()}

    for doc in manifest.documents:
        path = root / doc.path
        if not path.exists():
            report.skipped.append({"file": doc.path, "reason": "không tìm thấy file"})
            continue
        if path.suffix.lower() not in READERS:
            report.skipped.append({"file": doc.path, "reason": f"chưa đọc được định dạng {path.suffix}"})
            continue
        if skip_separate and doc.index != "main":
            report.skipped.append({"file": doc.path, "reason": f"index: {doc.index}, bỏ qua theo yêu cầu"})
            continue

        sha, mh = sha256_file(path), doc.meta_hash(params)
        old = existing.get(doc.path)
        if old and not force and old["sha256"] == sha and old["meta_hash"] == mh:
            report.files.append({"file": doc.path, "status": "unchanged", "chunks": old["chunk_count"]})
            log(f"{doc.path}: không đổi ({old['chunk_count']} đoạn)")
            continue

        rows = build_chunks(doc, path)
        if not rows:
            report.skipped.append({"file": doc.path,
                                   "reason": "không lấy được chữ nào (có thể là PDF scan, cần OCR)"})
            continue
        log(f"{doc.path}: nhúng {len(rows)} đoạn…")
        vectors = embedder.embed([r.embed_text for r in rows])
        _write(doc, sha, mh, rows, vectors)
        report.files.append({"file": doc.path, "status": "updated" if old else "added", "chunks": len(rows)})
        log(f"{doc.path}: {len(rows)} đoạn")

    removed = [p for p in existing if p not in listed]
    if removed:
        with store.connection() as conn:
            conn.execute("DELETE FROM documents WHERE subject = %s AND path = ANY(%s)", [subject, removed])
        for p in removed:
            report.files.append({"file": p, "status": "removed", "chunks": existing[p]["chunk_count"]})
            log(f"{p}: đã xóa khỏi chỉ mục")
    return report


def _write(doc: DocumentSpec, sha: str, mh: str, rows: list[ChunkRow], vectors: list[list[float]]):
    with store.connection() as conn, conn.transaction():
        doc_id = conn.execute(
            """INSERT INTO documents (subject, path, title, kind, index_name, cite_by, page_offset,
                                      related_chapters, sha256, meta_hash, chunk_count, ingested_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
               ON CONFLICT (subject, path) DO UPDATE SET
                   title = EXCLUDED.title, kind = EXCLUDED.kind, index_name = EXCLUDED.index_name,
                   cite_by = EXCLUDED.cite_by, page_offset = EXCLUDED.page_offset,
                   related_chapters = EXCLUDED.related_chapters, sha256 = EXCLUDED.sha256,
                   meta_hash = EXCLUDED.meta_hash, chunk_count = EXCLUDED.chunk_count, ingested_at = now()
               RETURNING id""",
            [doc.subject, doc.path, doc.title, doc.kind, doc.index, doc.cite_by, doc.page_offset,
             doc.related_chapters, sha, mh, len(rows)]).fetchone()["id"]
        conn.execute("DELETE FROM chunks WHERE document_id = %s", [doc_id])
        with conn.cursor().copy(
                "COPY chunks (document_id, subject, kind, index_name, chapter, pdf_page, page, section, ord,"
                " text, embedding) FROM STDIN WITH (FORMAT BINARY)") as copy:
            copy.set_types(["int4", "text", "text", "text", "int4", "int4", "int4", "text", "int4", "text",
                            "vector"])
            for i, (r, v) in enumerate(zip(rows, vectors)):
                copy.write_row([doc_id, doc.subject, doc.kind, doc.index, r.chapter, r.pdf_page, r.page,
                                r.section, i, r.text, np.asarray(v, dtype=np.float32)])
