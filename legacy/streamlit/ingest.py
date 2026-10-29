
import re
import shutil
from pathlib import Path

import config
import rag


def read_pdf(path):
    import pymupdf
    with pymupdf.open(path) as pdf:
        for i, page in enumerate(pdf, start=1):
            yield i, page.get_text()


def read_docx(path):
    import docx
    text = "\n".join(p.text for p in docx.Document(path).paragraphs)
    yield 1, text


def read_text(path):
    yield 1, Path(path).read_text(encoding="utf-8")


READERS = {".pdf": read_pdf, ".docx": read_docx, ".txt": read_text, ".md": read_text}


def clean(text):
    text = text.replace("­", "")              # gạch nối
    text = re.sub(r"-\n(\w)", r"\1", text)         # từ bị ngắt dòng
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk(text, size=config.CHUNK_SIZE, overlap=config.CHUNK_OVERLAP):
    """Cắt theo đoạn văn, gộp đến khoảng `size` ký tự, giữ lại phần đuôi để chồng lấn."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if cur and len(cur) + len(p) > size:
            chunks.append(cur)
            cur = cur[-overlap:]
        cur = f"{cur}\n{p}".strip()
        while len(cur) > size * 1.5:               # đoạn văn quá dài thì cắt cứng
            chunks.append(cur[:size])
            cur = cur[size - overlap:]
    if cur:
        chunks.append(cur)
    return chunks


def main():
    all_files = [f for f in sorted(Path(config.DATA_DIR).rglob("*")) if f.is_file()]
    files = [f for f in all_files if f.suffix.lower() in READERS]
    for f in all_files:
        if f.suffix.lower() not in READERS and f.suffix.lower() != ".yaml" and not f.name.startswith("."):
            print(f"!! {f.name}: bỏ qua vì không đọc được định dạng {f.suffix}")
    if not files:
        raise SystemExit(f"Không thấy tài liệu nào trong thư mục {config.DATA_DIR}/")

    shutil.rmtree(config.DB_DIR, ignore_errors=True)   # xây lại chỉ mục từ đầu
    col = rag.collection()

    for f in files:
        ids, docs, metas = [], [], []
        for page, raw in READERS[f.suffix.lower()](f):
            for j, c in enumerate(chunk(clean(raw))):
                if len(c) < 50:                    # bỏ đoạn rác (số trang, tiêu đề lẻ)
                    continue
                ids.append(f"{f.name}-p{page}-{j}")
                docs.append(c)
                metas.append({"source": f.name, "page": page})
        if not docs:
            print(f"!! {f.name}: không lấy được chữ nào (có thể là PDF scan, cần OCR)")
            continue
        for s in range(0, len(docs), 64):
            col.add(ids=ids[s:s + 64], documents=docs[s:s + 64],
                    embeddings=rag.embed(docs[s:s + 64]), metadatas=metas[s:s + 64])
        print(f"{f.name}: {len(docs)} đoạn")

    print(f"Xong. Tổng cộng {col.count()} đoạn trong {config.DB_DIR}/")


if __name__ == "__main__":
    main()
