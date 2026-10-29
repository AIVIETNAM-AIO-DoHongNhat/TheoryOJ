# TheoryOJ

Dự án Web học tập cho Khoa Lý luận chính trị. Kế hoạch chi tiết ở [PLAN.md](PLAN.md).

## Cấu trúc hiện tại

| Thư mục | Nội dung |
|---|---|
| `content/ktct/` | Học liệu môn KTCT và `manifest.yaml` (loại tài liệu, `page_offset`, ranh giới chương) |
| `eval/ktct/` | Bộ câu chuẩn `golden.jsonl` và kết quả đo trong `results/` |
| `services/rag/` | Dịch vụ tìm kiếm FastAPI: nạp tài liệu, tìm kết hợp vector + từ khóa, reranker |
| `infra/` | `docker-compose.yml` (Postgres + pgvector, rag) và `db/init.sql` |
| `legacy/streamlit/` | Bản chatbot Streamlit cũ, giữ lại để đo điểm nền |

File PDF, DOC, DOCX trong `content/` được lưu bằng Git LFS. Cần chạy `git lfs install` một lần trước khi clone.

## Dịch vụ tìm kiếm

Cần Docker và Python 3.11 trở lên. Nên dùng GPU: cài torch bản CUDA theo driver, ví dụ `.venv/Scripts/pip install --force-reinstall --no-deps torch==2.15.0+cu132 --index-url https://download.pytorch.org/whl/cu132` (xem phiên bản CUDA bằng `nvidia-smi`). Mô hình `BAAI/bge-m3` và `BAAI/bge-reranker-v2-m3` được tải về lần đầu chạy.

```bash
docker compose -f infra/docker-compose.yml up -d db       # Postgres + pgvector ở 127.0.0.1:5433
.venv/Scripts/pip install -e services/rag pytest httpx
cd services/rag
../../.venv/Scripts/python scripts/ingest_all.py --skip-separate   # nạp tăng dần, bỏ niên giám
../../.venv/Scripts/python scripts/evaluate.py                     # hit@5, so với điểm nền Streamlit
../../.venv/Scripts/python -m pytest -q
../../.venv/Scripts/python -m uvicorn app.main:app --port 8001
```

Trên Linux, macOS dùng `.venv/bin/python`, hoặc `make db ingest eval test rag`. Chạy lại `ingest_all.py` chỉ nhúng các file đã đổi nội dung hoặc đổi mục trong `manifest.yaml`. Thêm `--force` để nhúng lại toàn bộ.

```bash
curl -s localhost:8001/search -H 'content-type: application/json' \
  -d '{"query": "tỷ suất giá trị thặng dư là gì", "subject": "ktct", "top_k": 5}'
```

Trên Windows, `curl` trong Git Bash hoặc PowerShell không gửi chữ Việt trong `-d` dưới dạng UTF-8, nên server báo lỗi "error parsing the body". Khi đó hãy ghi body vào file UTF-8 rồi gửi bằng `--data-binary @q.json`.

`POST /search` nhận `chapters`, `kinds` (mặc định là mọi tài liệu thuộc chỉ mục chính, tức trừ niên giám) và `mode` (`vector`, `hybrid`, `hybrid_rerank`). `score` là điểm reranker trong khoảng 0–1. `POST /ingest` nhận `{"subject": "ktct", "force": false}` và cần header `X-API-Key` nếu đặt `RAG_API_KEY`.

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
