from pathlib import Path

from app.ingest.chunking import chunk
from app.ingest.cleaning import clean, reflow
from app.ingest.metadata import load_manifest
from app.ingest.readers import heading_level, read_md

REPO = Path(__file__).resolve().parents[3]


def test_clean_normalizes_and_drops_page_numbers():
    nfd = "giá trị"                      # "giá trị" dạng tổ hợp
    assert clean(f"{nfd}\n57\nthặng dư") == "giá trị\nthặng dư"
    assert clean("tư bản bất bi-\nến") == "tư bản bất biến"


def test_reflow_joins_wrapped_lines_and_keeps_list_items():
    raw = "Máy móc dù hiện đại, C.Mác so\nsánh như chiếc bình.\n- Tư bản khả biến\nBộ phận tư bản"
    assert reflow(raw).split("\n\n") == [
        "Máy móc dù hiện đại, C.Mác so sánh như chiếc bình.", "- Tư bản khả biến Bộ phận tư bản"]


def test_chunk_respects_size_and_overlaps_by_sentence():
    sentences = [f"Câu số {i} nói về giá trị thặng dư." for i in range(100)]
    chunks = chunk(" ".join(sentences), size=300, overlap=80)
    assert len(chunks) > 5
    assert all(len(c) <= 300 for c in chunks)
    # Đoạn sau mở đầu bằng câu cuối của đoạn trước, không cắt giữa từ.
    assert chunks[1].split("\n")[0] in chunks[0]
    assert all(c[0].isupper() for c in chunks)


def test_chunk_short_text_is_single_chunk():
    assert chunk("Hàng hóa có hai thuộc tính.") == ["Hàng hóa có hai thuộc tính."]


def test_heading_levels():
    assert heading_level("I- TÌNH HÌNH VÀ NGUYÊN NHÂN", False) == 1
    assert heading_level("2.1. BỐI CẢNH TRONG NƯỚC", False) == 2
    assert heading_level("1- Quan điểm chỉ đạo", True) == 2
    assert heading_level("1. Trong nền kinh tế thị trường", False) is None   # ý liệt kê
    assert heading_level("Trong nền kinh tế thị trường", False) is None


def test_read_md_assigns_sections(tmp_path):
    f = tmp_path / "nq.md"
    f.write_text("# Nghị quyết\n\n- Nguồn: https://x\n\n---\n\n**I- QUAN ĐIỂM CHỈ ĐẠO**\n\n"
                 "1. Kinh tế tư nhân là động lực.\n\n**II- MỤC TIÊU**\n\n**1. Đến năm 2030**\n\n"
                 "Có 2 triệu doanh nghiệp.\n", encoding="utf-8")
    segs = list(read_md(f))
    assert [(s.section, s.text) for s in segs] == [
        ("I- QUAN ĐIỂM CHỈ ĐẠO", "1. Kinh tế tư nhân là động lực."),
        ("II- MỤC TIÊU › 1. Đến năm 2030", "Có 2 triệu doanh nghiệp."),
    ]


def test_manifest_ktct_chapters_and_offsets():
    m = load_manifest(REPO / "content" / "ktct")
    gt = next(d for d in m.documents if d.kind == "giao_trinh")
    assert gt.chapter_of(4) is None
    assert gt.chapter_of(56) == 3
    assert gt.chapter_of(175) == 6
    assert gt.printed_page(56) == 55
    assert all(c.title for c in gt.chapters)
    assert next(d for d in m.documents if d.kind == "so_lieu").index == "separate"


def test_meta_hash_changes_with_chapters_and_params():
    m = load_manifest(REPO / "content" / "ktct")
    gt = next(d for d in m.documents if d.kind == "giao_trinh")
    h = gt.meta_hash({"chunk_size": 1000})
    assert h == gt.meta_hash({"chunk_size": 1000})
    assert h != gt.meta_hash({"chunk_size": 800})
    gt.raw = {**gt.raw, "page_offset": 0}
    assert h != gt.meta_hash({"chunk_size": 1000})
