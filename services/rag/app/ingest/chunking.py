import re

_SENTENCE = re.compile(r"(?<=[.!?;…])\s+")


def _units(text: str, size: int) -> list[str]:
    """Tách thành đoạn văn. Đoạn văn dài hơn `size` được tách tiếp thành câu, câu quá dài thì cắt cứng."""
    out = []
    for para in (p.strip() for p in re.split(r"\n\s*\n", text)):
        if not para:
            continue
        if len(para) <= size:
            out.append(para)
            continue
        for sent in _SENTENCE.split(para):
            while len(sent) > size:
                cut = sent.rfind(" ", 0, size)
                cut = cut if cut > size // 2 else size
                out.append(sent[:cut].strip())
                sent = sent[cut:].strip()
            if sent:
                out.append(sent)
    return out


def chunk(text: str, size: int = 1000, overlap: int = 200) -> list[str]:
    """Gộp đoạn văn, câu đến khoảng `size` ký tự. Đoạn sau mở đầu bằng các câu cuối của đoạn trước
    (tối đa `overlap` ký tự) để ý nằm ở ranh giới không bị mất ngữ cảnh."""
    chunks: list[str] = []
    cur: list[str] = []
    cur_len = 0
    fresh = 0                                   # số đơn vị mới (không phải phần chồng lấn) trong cur
    for u in _units(text, size):
        if cur and cur_len + len(u) + 1 > size:
            chunks.append("\n".join(cur))
            tail: list[str] = []
            tail_len = 0
            for prev in reversed(cur):
                if tail_len + len(prev) > overlap:
                    break
                tail.insert(0, prev)
                tail_len += len(prev) + 1
            cur, cur_len, fresh = tail, tail_len, 0
        cur.append(u)
        cur_len += len(u) + 1
        fresh += 1
    if cur and fresh:
        chunks.append("\n".join(cur))
    return chunks
