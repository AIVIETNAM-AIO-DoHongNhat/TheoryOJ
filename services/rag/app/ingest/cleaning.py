import re
import unicodedata

_SENTENCE_END = re.compile(r"[.!?:;…\"”)]$")
_LIST_START = re.compile(r"^([-+•–*]|\d+[.)]|[a-zđ]\)|Thứ\s)", re.IGNORECASE)
_PAGE_NUMBER = re.compile(r"^\s*\d{1,4}\s*$")


def clean(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("­", "")                # gạch nối mềm
    text = re.sub(r"-\n(\w)", r"\1", text)             # từ bị ngắt dòng
    text = re.sub(r"[ \t ]+", " ", text)
    text = "\n".join(line for line in text.split("\n") if not _PAGE_NUMBER.match(line))
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def reflow(text: str) -> str:
    """Nối các dòng bị ngắt cứng trong PDF thành đoạn văn, phân cách đoạn bằng dòng trống.

    Một dòng được coi là bắt đầu đoạn mới nếu dòng trước kết thúc bằng dấu câu
    hoặc chính nó mở đầu bằng gạch đầu dòng, số thứ tự, "Thứ nhất"…
    """
    paras: list[str] = []
    for line in (l.strip() for l in text.split("\n")):
        if not line:
            if paras and paras[-1]:
                paras.append("")
            continue
        if paras and paras[-1] and not _SENTENCE_END.search(paras[-1]) and not _LIST_START.match(line):
            paras[-1] = f"{paras[-1]} {line}"
        else:
            paras.append(line)
    return "\n\n".join(p for p in paras if p)


def normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()
