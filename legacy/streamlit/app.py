import csv
import datetime
from pathlib import Path

import streamlit as st
from openai import OpenAI

import config
import rag

SYSTEM_QA = """Bạn là trợ lý cố vấn học tập môn Kinh tế chính trị Mác-Lênin cho học viên.
Quy tắc:
1. Chỉ trả lời dựa trên phần TÀI LIỆU bên dưới. Không bịa thêm.
2. Nếu tài liệu không đủ để trả lời, nói rõ: "Giáo trình không đề cập nội dung này" và gợi ý học viên hỏi giảng viên.
3. Sau mỗi ý chính, ghi nguồn dạng [tên tài liệu, tr. X].
4. Trả lời bằng tiếng Việt, ngắn gọn, mạch lạc, dùng đúng thuật ngữ của giáo trình."""

SYSTEM_EX = """Bạn là trợ lý hướng dẫn giải bài tập môn Kinh tế chính trị Mác-Lênin.
Giải TỪNG BƯỚC theo mẫu:
- Bước 1: Tóm tắt dữ kiện và ký hiệu (c, v, m, m', W, p, p'...).
- Bước 2: Nêu công thức cần dùng, lấy từ TÀI LIỆU và ghi nguồn [tên tài liệu, tr. X].
- Bước 3: Thay số và tính, viết rõ từng phép tính.
- Bước 4: Kết luận và giải thích ý nghĩa kinh tế của kết quả.
Một số công thức chuẩn: W = c + v + m; m' = m/v × 100%; p' = m/(c + v) × 100%;
cấu tạo hữu cơ = c/v; M = m' × V.
Nếu đề bài thiếu dữ kiện, chỉ ra dữ kiện còn thiếu thay vì tự đặt số."""

LOG = Path(__file__).with_name("logs.csv")
client = OpenAI(base_url=config.LLM_BASE_URL, api_key=config.LLM_API_KEY)


def build_context(hits):
    return "\n\n".join(f"[{h['source']}, tr. {h['page']}]\n{h['text']}" for h in hits)


def log(mode, question, answer):
    new = not LOG.exists()
    with LOG.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["thoi_gian", "che_do", "cau_hoi", "tra_loi"])
        w.writerow([datetime.datetime.now().isoformat(timespec="seconds"), mode, question, answer])


st.set_page_config(page_title="Cố vấn Kinh tế chính trị", page_icon="📘")
st.title("Cố vấn học tập Kinh tế chính trị Mác-Lênin")
mode = st.sidebar.radio("Chế độ", ["Hỏi đáp lý thuyết", "Hướng dẫn giải bài tập"])
st.sidebar.caption("Câu trả lời chỉ dựa trên giáo trình và tài liệu công khai. "
                   "Hãy đối chiếu với giáo trình khi ôn thi.")

if "history" not in st.session_state:
    st.session_state.history = []

for msg in st.session_state.history:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

question = st.chat_input("Nhập câu hỏi hoặc đề bài...")
if question:
    st.session_state.history.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)

    hits = rag.retrieve(question)
    system = SYSTEM_QA if mode.startswith("Hỏi") else SYSTEM_EX
    user = f"TÀI LIỆU:\n{build_context(hits)}\n\nCÂU HỎI: {question}"

    with st.chat_message("assistant"):
        stream = client.chat.completions.create(
            model=config.LLM_MODEL, stream=True, temperature=0.2,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}])
        answer = st.write_stream(c.choices[0].delta.content or "" for c in stream if c.choices)
        with st.expander("Các đoạn giáo trình đã dùng"):
            for h in hits:
                st.markdown(f"**{h['source']}, tr. {h['page']}** (độ khớp {h['score']})")
                st.caption(h["text"][:500] + "...")

    st.session_state.history.append({"role": "assistant", "content": answer})
    log(mode, question, answer)
