# Trên Windows không có make, chạy trực tiếp các lệnh tương ứng trong README.
PY ?= $(if $(wildcard .venv/Scripts/python.exe),.venv/Scripts/python,.venv/bin/python)
COMPOSE = docker compose -f infra/docker-compose.yml
RAG = cd services/rag &&

.PHONY: db rag ingest ingest-all eval test

db:            ## Khởi động Postgres + pgvector
	$(COMPOSE) up -d db

rag:           ## Chạy dịch vụ tìm kiếm ở cổng 8001
	$(RAG) ../../$(PY) -m uvicorn app.main:app --port 8001 --reload

ingest:        ## Nạp tăng dần, bỏ qua niên giám
	$(RAG) ../../$(PY) scripts/ingest_all.py --skip-separate

ingest-all:    ## Nạp tăng dần cả chỉ mục riêng
	$(RAG) ../../$(PY) scripts/ingest_all.py

eval:          ## Đo trên bộ câu chuẩn, so với điểm nền Streamlit
	$(RAG) ../../$(PY) scripts/evaluate.py

test:
	$(RAG) ../../$(PY) -m pytest -q
