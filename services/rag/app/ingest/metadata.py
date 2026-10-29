"""Đọc content/<môn>/manifest.yaml và tra chương, trang in cho từng trang PDF."""
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

import yaml

KINDS = {"giao_trinh", "van_kien", "tham_khao", "cand", "so_lieu"}


@dataclass
class Chapter:
    number: int
    first: int
    last: int
    title: str | None = None


@dataclass
class DocumentSpec:
    subject: str
    path: str                         # tính từ content/<môn>/, dùng làm khóa của tài liệu
    title: str
    kind: str
    cite_by: str = "page"
    index: str = "main"
    page_offset: int = 0
    chapters: list[Chapter] = field(default_factory=list)
    related_chapters: list[int] = field(default_factory=list)
    skip_pages: set[int] = field(default_factory=set)
    raw: dict = field(default_factory=dict)

    def chapter_of(self, pdf_page: int | None) -> int | None:
        if pdf_page is None:
            return None
        for c in self.chapters:
            if c.first <= pdf_page <= c.last:
                return c.number
        return None

    def printed_page(self, pdf_page: int | None) -> int | None:
        return None if pdf_page is None else pdf_page + self.page_offset

    def meta_hash(self, extra: dict) -> str:
        """Mã băm của mọi thứ ảnh hưởng tới kết quả nạp, trừ nội dung file.
        Đổi chương, page_offset hay tham số cắt đoạn thì tài liệu được nạp lại."""
        keep = {k: v for k, v in self.raw.items() if k not in {"todo", "converted_from", "publisher"}}
        blob = json.dumps({"doc": keep, **extra}, ensure_ascii=False, sort_keys=True, default=str)
        return hashlib.sha256(blob.encode()).hexdigest()


@dataclass
class Manifest:
    subject: str
    name: str
    root: Path
    documents: list[DocumentSpec]


def load_manifest(subject_dir: Path) -> Manifest:
    data = yaml.safe_load((subject_dir / "manifest.yaml").read_text(encoding="utf-8"))
    subject = data["subject"]
    docs = []
    for d in data.get("documents", []):
        if d["kind"] not in KINDS:
            raise ValueError(f"{d['file']}: kind '{d['kind']}' không hợp lệ, phải là một trong {sorted(KINDS)}")
        docs.append(DocumentSpec(
            subject=subject,
            path=d["file"],
            title=d.get("title", Path(d["file"]).stem),
            kind=d["kind"],
            cite_by=d.get("cite_by", "page"),
            index=d.get("index", "main"),
            page_offset=d.get("page_offset", 0),
            chapters=[Chapter(c["number"], c["pages"][0], c["pages"][1], c.get("title"))
                      for c in d.get("chapters", [])],
            related_chapters=d.get("related_chapters", []),
            skip_pages=set(d.get("skip_pages", [])),
            raw=d,
        ))
    return Manifest(subject=subject, name=data.get("name", subject), root=subject_dir, documents=docs)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()
