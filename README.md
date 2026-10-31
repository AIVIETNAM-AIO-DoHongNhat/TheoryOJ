# TheoryOJ

Dự án Web học tập cho Khoa Lý luận chính trị. Kế hoạch chi tiết ở [PLAN.md](PLAN.md).

## Cấu trúc hiện tại

| Thư mục | Nội dung |
|---|---|
| `content/ktct/` | Học liệu môn KTCT và `manifest.yaml` (loại tài liệu, `page_offset`, ranh giới chương) |
| `eval/ktct/` | Bộ câu chuẩn `golden.jsonl` và kết quả đo trong `results/` |
| `apps/web/` | Next.js: cổng học tập, trợ lý `/tro-ly` (lưu hội thoại, đánh giá); migration Drizzle trong `drizzle/` |
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

## Web và chatbot

Cần Node.js 22, dịch vụ rag đang chạy ở cổng 8001 và một mô hình ngôn ngữ có API tương thích OpenAI (Ollama hoặc OpenRouter, khai báo `LLM_*` trong `.env` ở gốc repo).

```bash
cd apps/web
npm install
npm run db:migrate   # tạo bảng hội thoại, đánh giá, giới hạn tần suất, lượt ôn tập (cần Postgres ở trên)
npm run dev          # http://localhost:3000, trợ lý ở /tro-ly
npm test             # kiểm thử công thức KTCT, bài tập sinh số, ngân hàng trắc nghiệm, render trích dẫn
npm run eval         # đo từ chối đúng và tính toán trên eval/ktct/golden.jsonl
```

Trợ lý không cần đăng nhập. Mỗi trình duyệt nhận một mã khách ẩn danh trong cookie `theoryoj_khach` để giữ lịch sử hội thoại và giới hạn tần suất. Câu hỏi, câu trả lời, trích dẫn, lý do từ chối và đánh giá 👍/👎 được lưu trong bảng `messages`, `feedback`; giảng viên xem lại bằng truy vấn SQL cho đến khi có trang quản trị. Sửa schema trong `src/lib/db/schema/` rồi chạy `npm run db:generate` và `npm run db:migrate`.

Trắc nghiệm đọc từ `content/<môn>/question-bank/chuong-<n>.yaml`; giảng viên sửa file theo quy ước trong `_mau.yaml` rồi chạy `npm test` để kiểm tra. Kết quả trắc nghiệm và bài tập lưu trong bảng `practice_attempts`, hiện ở trang `/tien-do`.

`npm run eval -- --ids ktct-015,ktct-041` chỉ chạy vài câu, `--answers` sinh câu trả lời cho cả câu lý thuyết để chấm tay. Kết quả lưu ở `eval/ktct/results/chat-*.json`.

Một câu hỏi đi qua `/api/chat` theo các bước ở mục 3 của PLAN.md: viết lại câu nối tiếp (`features/chat/server/rewrite-query.ts`), phân loại bằng luật rồi bằng mô hình (`guardrails.ts`), tìm kiếm qua rag, so ngưỡng `REFUSAL_THRESHOLD`, rồi trả lời bằng `streamText`. Chế độ bài tập bắt buộc mô hình gọi công cụ `tinh_ktct` (`src/domain/ktct/formulas.ts`) ở bước đầu.

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
