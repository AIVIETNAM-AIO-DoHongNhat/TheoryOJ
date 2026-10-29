from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from ..retrieval import hybrid, store
from ..schemas import SearchRequest, SearchResponse

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest) -> SearchResponse:
    filters = store.Filters(subject=req.subject, chapters=req.chapters, kinds=req.kinds)
    result = await run_in_threadpool(hybrid.search, req.query, filters, req.top_k, req.mode)
    return SearchResponse(hits=result.hits, max_score=result.max_score, mode=result.mode)
