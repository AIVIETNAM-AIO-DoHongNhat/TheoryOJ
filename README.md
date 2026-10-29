# TheoryOJ

Dự án Web học tập cho Khoa Lý luận chính trị. Kế hoạch chi tiết ở [PLAN.md](PLAN.md).

## Cấu trúc hiện tại

| Thư mục | Nội dung |
|---|---|
| `content/ktct/` | Học liệu môn KTCT và `manifest.yaml` (loại tài liệu, `page_offset`, ranh giới chương) |
| `eval/ktct/` | Bộ câu chuẩn `golden.jsonl` và kết quả đo trong `results/` |
| `legacy/streamlit/` | Bản chatbot Streamlit cũ, giữ lại để đo điểm nền |

File PDF, DOC, DOCX trong `content/` được lưu bằng Git LFS. Cần chạy `git lfs install` một lần trước khi clone.

## Chạy bản Streamlit cũ

```bash
python -m venv .venv
.venv/Scripts/pip install -r legacy/streamlit/requirements.txt   # Linux, macOS: .venv/bin/pip
cp .env.example .env
python legacy/streamlit/ingest.py        # chỉ khi cần dựng lại chỉ mục
streamlit run legacy/streamlit/app.py
```

## Đo điểm nền

```bash
python legacy/streamlit/evaluate_baseline.py          # hit@5, không cần mô hình ngôn ngữ
python legacy/streamlit/evaluate_baseline.py --llm    # thêm tỷ lệ từ chối và tính toán, cần Ollama đang chạy
```
