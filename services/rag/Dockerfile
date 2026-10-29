FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

WORKDIR /srv
COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml

COPY app ./app
COPY scripts ./scripts

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
