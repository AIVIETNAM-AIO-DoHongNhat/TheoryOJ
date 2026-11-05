FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

WORKDIR /srv
COPY pyproject.toml ./
# LOCAL_MODELS=1 cài thêm torch và sentence-transformers để chạy bge-m3 trên máy (hàng GB). Mặc định gọi OpenRouter.
ARG LOCAL_MODELS=0
RUN if [ "$LOCAL_MODELS" = "1" ]; then uv pip install --system -r pyproject.toml --extra local; \
    else uv pip install --system -r pyproject.toml; fi

COPY app ./app
COPY scripts ./scripts

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
