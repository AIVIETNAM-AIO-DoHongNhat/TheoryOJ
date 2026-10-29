"""Đo chất lượng tìm kiếm trên bộ câu chuẩn eval/<môn>/golden.jsonl.

    python scripts/evaluate.py                          # cả ba chế độ, so với điểm nền Streamlit
    python scripts/evaluate.py --modes hybrid_rerank    # chỉ một chế độ

Một câu được tính là trúng nếu trong top k có đoạn thuộc đúng tài liệu và nằm trong khoảng
trang PDF của `gold` (hoặc đúng mục, với tài liệu trích theo mục). Kết quả lưu ở eval/<môn>/results/.
"""
import argparse
import collections
import datetime
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.retrieval import hybrid, store  # noqa: E402
from app.settings import REPO_ROOT, get_settings  # noqa: E402

IN_SCOPE = {"answer", "missing_data"}


def gold_rank(hits: list[dict], gold: list[dict]) -> int | None:
    """Hạng (từ 1) của đoạn đầu tiên khớp với một nguồn trong `gold`."""
    for rank, h in enumerate(hits, start=1):
        for g in gold:
            if h["document"] != g["document"]:
                continue
            if "pdf_pages" in g and h["pdf_page"] is not None:
                lo, hi = g["pdf_pages"]
                if lo <= h["pdf_page"] <= hi:
                    return rank
            if "section" in g and h["section"] and g["section"].lower() in h["section"].lower():
                return rank
    return None


def pct(n: int, d: int) -> str:
    return f"{n}/{d} ({100 * n / d:.0f} %)" if d else "–"


def best_threshold(rows: list[dict]) -> dict:
    """Ngưỡng max_score tách tốt nhất câu cần trả lời (trên ngưỡng) với câu cần từ chối (dưới ngưỡng).
    Chỉ để tham khảo: mục 2.3 của PLAN.md cho thấy ngưỡng không đủ để chặn câu khiêu khích."""
    answer = [r["max_score"] for r in rows if r["expect"] in IN_SCOPE]
    refuse = [r["max_score"] for r in rows if r["expect"] == "refuse"]
    if not answer or not refuse:
        return {}
    best = None
    for t in sorted(set(answer + refuse)):
        kept = sum(s >= t for s in answer)
        blocked = sum(s < t for s in refuse)
        if best is None or kept + blocked > best[1] + best[2]:
            best = (t, kept, blocked)
    t, kept, blocked = best
    return {"threshold": round(t, 4), "answer_kept": pct(kept, len(answer)),
            "refuse_blocked": pct(blocked, len(refuse)),
            "overlap": min(answer) < max(refuse)}


def run_mode(items: list[dict], subject: str, mode: str, top_k: int) -> dict:
    rows, latency = [], []
    for it in items:
        t0 = time.perf_counter()
        res = hybrid.search(it["question"], store.Filters(subject=subject), top_k=top_k, mode=mode)
        latency.append(time.perf_counter() - t0)
        row = {"id": it["id"], "type": it["type"], "expect": it["expect"], "chapter": it.get("chapter"),
               "max_score": res.max_score,
               "hits": [{k: h[k] for k in ("document", "pdf_page", "page", "section", "score")}
                        for h in res.hits]}
        if "gold" in it:
            rank = gold_rank(res.hits, it["gold"])
            row["rank"] = rank
            row["hit@1"] = rank == 1
            row["hit@k"] = rank is not None
        rows.append(row)
        print(f"  {mode:<14} {it['id']} {it['type']:<12} max={res.max_score:.3f} rank={row.get('rank', '-')}",
              file=sys.stderr)

    scoped = [r for r in rows if "rank" in r]
    by_chapter = collections.defaultdict(list)
    for r in scoped:
        by_chapter[r["chapter"]].append(r["hit@k"])
    summary = {
        f"hit@{top_k}": pct(sum(r["hit@k"] for r in scoped), len(scoped)),
        "hit@1": pct(sum(r["hit@1"] for r in scoped), len(scoped)),
        "mrr": round(statistics.mean(1 / r["rank"] if r["rank"] else 0 for r in scoped), 3) if scoped else None,
        f"hit@{top_k}_by_chapter": {c: pct(sum(v), len(v)) for c, v in sorted(by_chapter.items())},
        "sources_in_top_k_for_in_scope": dict(collections.Counter(
            h["document"] for r in scoped for h in r["hits"]).most_common()),
        "latency_s": {"median": round(statistics.median(latency), 2), "max": round(max(latency), 2)},
    }
    for t in ("theory", "calc", "out_of_scope", "provocative"):
        s = [r["max_score"] for r in rows if r["type"] == t]
        if s:
            summary[f"max_score_{t}"] = {"min": min(s), "median": round(statistics.median(s), 4), "max": max(s)}
    summary["threshold_reference"] = best_threshold(rows)
    return {"summary": summary, "rows": rows}


def compare_with_baseline(results_dir: Path, runs: dict, top_k: int) -> dict | None:
    files = sorted(results_dir.glob("baseline-streamlit-*.json"))
    if not files:
        return None
    base = json.loads(files[-1].read_text(encoding="utf-8"))
    base_hit = {r["id"]: r["hit@5"] for r in base["rows"] if "hit@5" in r}
    out = {"file": files[-1].name, "hit@5": base["summary"]["hit@5"]}
    if top_k != 5:
        return out
    for mode, run in runs.items():
        now = {r["id"]: r["hit@k"] for r in run["rows"] if "hit@k" in r}
        out[mode] = {"regressions": sorted(i for i in now if base_hit.get(i) and not now[i]),
                     "improvements": sorted(i for i in now if now[i] and base_hit.get(i) is False)}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", default="ktct")
    ap.add_argument("--modes", default=",".join(hybrid.MODES))
    ap.add_argument("--top-k", type=int, default=5)
    args = ap.parse_args()

    eval_dir = REPO_ROOT / "eval" / args.subject
    items = [json.loads(line) for line in (eval_dir / "golden.jsonl").open(encoding="utf-8") if line.strip()]
    modes = [m.strip() for m in args.modes.split(",") if m.strip()]

    runs = {}
    for mode in modes:
        print(f"== {mode}", file=sys.stderr)
        runs[mode] = run_mode(items, args.subject, mode, args.top_k)

    s = get_settings()
    with store.connection() as conn:
        index_size = store.count_chunks(conn, args.subject)
    store.close()
    meta = {"system": "services/rag", "subject": args.subject, "top_k": args.top_k,
            "embed_model": s.embed_model, "rerank_model": s.rerank_model,
            "chunk_size": s.chunk_size, "chunk_overlap": s.chunk_overlap,
            "candidates": s.candidates, "rerank_candidates": s.rerank_candidates,
            "index_size": index_size, "golden_items": len(items),
            "golden_status": dict(collections.Counter(i["status"] for i in items))}
    results_dir = eval_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    baseline = compare_with_baseline(results_dir, runs, args.top_k)

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    out = results_dir / f"rag-{stamp}.json"
    out.write_text(json.dumps({"meta": meta, "baseline": baseline, "runs": runs}, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(json.dumps({"meta": meta, "baseline": baseline,
                      "summary": {m: r["summary"] for m, r in runs.items()}}, ensure_ascii=False, indent=2))
    print(f"\nChi tiết: {out}")


if __name__ == "__main__":
    main()
