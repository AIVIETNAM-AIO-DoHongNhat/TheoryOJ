import hmac
import threading

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.concurrency import run_in_threadpool

from ..ingest.pipeline import ingest_subject
from ..schemas import IngestRequest, IngestResponse
from ..settings import get_settings

router = APIRouter()
_running = threading.Lock()


def require_api_key(x_api_key: str | None = Header(default=None)):
    expected = get_settings().rag_api_key
    if expected and not (x_api_key and hmac.compare_digest(x_api_key, expected)):
        raise HTTPException(status_code=401, detail="Sai hoặc thiếu X-API-Key")


@router.post("/ingest", response_model=IngestResponse, dependencies=[Depends(require_api_key)])
async def ingest(req: IngestRequest) -> IngestResponse:
    if not _running.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Đang có một lượt nạp khác chạy")
    try:
        report = await run_in_threadpool(ingest_subject, req.subject, req.force, req.skip_separate)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    finally:
        _running.release()
    return IngestResponse(**report.as_dict())
