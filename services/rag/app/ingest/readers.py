"""Đọc tài liệu thành các phân đoạn có vị trí trích dẫn.

PDF trả về một phân đoạn cho mỗi trang (trích dẫn theo trang). MD và DOCX trả về một phân đoạn
cho mỗi mục (trích dẫn theo tiêu đề mục gần nhất), vì hai định dạng này không có số trang.
"""
import re
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

from .cleaning import clean, reflow


@dataclass
class Segment:
    text: str
    pdf_page: int | None = None
    section: str | None = None


# ---------- Nhận dạng tiêu đề mục ----------

_ROMAN = re.compile(r"^[IVXLC]+\s*[-.–]\s*\S")             # I- , II. , III –
_NUMBERED = re.compile(r"^(\d+(?:\.\d+)*)\s*[-.]\s*\S")     # 1- , 1. , 2.1. , 2.1.2.
_MAX_HEADING = 160


def heading_level(text: str, emphasized: bool) -> int | None:
    """Cấp tiêu đề: 1 cho mục La Mã, 2 cho mục đánh số. None nếu không phải tiêu đề.

    Mục đánh số một cấp ("1.") chỉ được coi là tiêu đề khi in đậm, vì trong văn kiện
    phần lớn dòng "1. …" là ý liệt kê. Mục nhiều cấp ("2.1.") luôn là tiêu đề.
    """
    t = text.strip()
    if not t or len(t) > _MAX_HEADING:
        return None
    if _ROMAN.match(t):
        return 1
    m = _NUMBERED.match(t)
    if m and ("." in m.group(1) or emphasized):
        return 2
    if emphasized and t.isupper() and len(t) < 80:
        return 1
    return None


class _SectionTracker:
    def __init__(self):
        self.path: dict[int, str] = {}

    def update(self, level: int, text: str):
        self.path = {k: v for k, v in self.path.items() if k < level}
        self.path[level] = text.strip().rstrip(".:")[:120]

    @property
    def label(self) -> str | None:
        return " › ".join(self.path[k] for k in sorted(self.path)) or None


def _group(paragraphs: Iterator[tuple[str, int | None]]) -> Iterator[Segment]:
    """Gom các đoạn văn (text, cấp tiêu đề) thành phân đoạn theo mục."""
    tracker = _SectionTracker()
    buf: list[str] = []
    for text, level in paragraphs:
        if level is not None:
            if buf:
                yield Segment(clean("\n\n".join(buf)), section=tracker.label)
                buf = []
            tracker.update(level, text)
            continue
        buf.append(text)
    if buf:
        yield Segment(clean("\n\n".join(buf)), section=tracker.label)


# ---------- Định dạng ----------

def read_pdf(path: Path) -> Iterator[Segment]:
    import pymupdf
    with pymupdf.open(path) as pdf:
        for i, page in enumerate(pdf, start=1):
            yield Segment(reflow(clean(page.get_text())), pdf_page=i)


_MD_META = re.compile(r"^- (Nguồn|Ngày đăng|Ngày tải|Ngày ban hành):")
_MD_BOLD_LINE = re.compile(r"^(\*\*|__)(.+?)\1[.:]?$")
_MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def _strip_md(text: str) -> str:
    text = _MD_LINK.sub(r"\1", text)
    return re.sub(r"(\*\*|__|(?<!\w)[*_]|[*_](?!\w))", "", text).strip()


def _md_paragraphs(raw: str) -> Iterator[tuple[str, int | None]]:
    for block in re.split(r"\n\s*\n", raw):
        for line in block.split("\n") if block.lstrip().startswith(("#", "**", "__")) else [block]:
            line = line.strip()
            if not line or line == "---" or _MD_META.match(line):
                continue
            if line.startswith("#"):
                hashes = len(line) - len(line.lstrip("#"))
                text = _strip_md(line.lstrip("#"))
                # "#" là tên văn bản, không dùng làm mục. "##" trở xuống là mục không đánh số.
                level = None if hashes == 1 else (heading_level(text, True) or 1)
                if level is not None:
                    yield text, level
                continue
            m = _MD_BOLD_LINE.match(line)
            text = _strip_md(line)
            yield text, heading_level(text, emphasized=bool(m))


def read_md(path: Path) -> Iterator[Segment]:
    yield from _group(_md_paragraphs(Path(path).read_text(encoding="utf-8")))


def read_docx(path: Path) -> Iterator[Segment]:
    import docx

    def paragraphs():
        for p in docx.Document(str(path)).paragraphs:
            text = p.text.strip()
            if not text:
                continue
            runs = [r for r in p.runs if r.text.strip()]
            bold = bool(runs) and all(r.bold for r in runs)
            yield text, heading_level(text, emphasized=bold or p.style.name.lower().startswith("heading"))

    yield from _group(paragraphs())


READERS = {".pdf": read_pdf, ".md": read_md, ".txt": read_md, ".docx": read_docx}
