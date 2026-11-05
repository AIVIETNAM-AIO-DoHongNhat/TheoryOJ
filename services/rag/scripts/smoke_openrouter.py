"""Kiểm tra nhanh OpenRouter có thay được mô hình chạy trên máy không (cần OPENROUTER_API_KEY hoặc LLM_API_KEY).

    python scripts/smoke_openrouter.py                 # so vector, thử rerank, chạy tìm kiếm thật trên chỉ mục hiện có
    python scripts/smoke_openrouter.py --no-local      # bỏ bước so với bge-m3 chạy trên máy (không cần torch)

1. Embedding: vector của baai/bge-m3 qua OpenRouter so với vector sentence-transformers trên cùng câu (cosine nên ≥ 0,99).
2. Rerank: gọi mô hình RERANK_MODEL, in thang điểm và độ trễ.
3. Tìm kiếm thật: một câu trong phạm vi và một câu ngoài phạm vi qua hybrid.search, để thấy điểm cao nhất của hai nhóm.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402

from app.retrieval import embedder, hybrid, openrouter, reranker, store  # noqa: E402
from app.settings import REPO_ROOT, get_settings  # noqa: E402


def golden(subject: str) -> list[dict]:
    path = REPO_ROOT / "eval" / subject / "golden.jsonl"
    return [json.loads(line) for line in path.open(encoding="utf-8") if line.strip()]


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")      # console Windows mặc định không in được tiếng Việt
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", default="ktct")
    ap.add_argument("--no-local", action="store_true")
    args = ap.parse_args()

    s = get_settings()
    s.embed_provider = s.rerank_provider = "openrouter"
    if s.embed_model.startswith("BAAI/"):
        s.embed_model = "baai/bge-m3"
    if s.rerank_model.startswith("BAAI/"):
        s.rerank_model = "cohere/rerank-v3.5"
    if not s.openrouter_api_key:
        sys.exit("Thiếu khóa: đặt OPENROUTER_API_KEY hoặc LLM_API_KEY trong .env ở gốc repo.")
    print(f"embed: {s.embed_model} | rerank: {s.rerank_model} | ngưỡng từ chối hiện tại: 0.3 (REFUSAL_THRESHOLD)\n")

    items = golden(args.subject)
    in_scope = next(i for i in items if i["type"] == "theory")
    out_scope = next(i for i in items if i["type"] == "out_of_scope")

    print("== 1. Embedding")
    with store.connection() as conn:
        chunk_texts = [r["text"] for r in conn.execute(
            "SELECT text FROM chunks WHERE subject = %s ORDER BY random() LIMIT 4", [args.subject]).fetchall()]
    texts = [i["question"] for i in items[:6]] + chunk_texts
    t0 = time.perf_counter()
    remote = np.array(embedder.embed(texts), dtype=np.float32)
    print(f"  {len(texts)} văn bản, {remote.shape[1]} chiều, {time.perf_counter() - t0:.1f}s")
    if args.no_local:
        print("  (bỏ qua so sánh với bản chạy trên máy)")
    else:
        from sentence_transformers import SentenceTransformer
        local = SentenceTransformer("BAAI/bge-m3", device="cpu")
        local.max_seq_length = s.max_seq_length
        ref = local.encode(texts, normalize_embeddings=True)
        cos = (remote * ref).sum(axis=1)
        print(f"  cosine với bge-m3 chạy trên máy: min {cos.min():.4f}, trung bình {cos.mean():.4f}")
        print("  " + ("ĐẠT: dùng được chỉ mục cũ, không cần nạp lại." if cos.min() >= 0.99
                      else "KHÔNG ĐẠT: vector khác bản cũ, cần nạp lại chỉ mục (ingest_all.py --force)."))

    print("\n== 2. Rerank")
    docs = ["Giá trị thặng dư là phần giá trị dôi ra ngoài giá trị sức lao động do công nhân làm thuê tạo ra.",
            "Hôm nay trời nắng đẹp, nhiệt độ khoảng 30 độ.",
            "Tư bản bất biến là bộ phận tư bản tồn tại dưới hình thái tư liệu sản xuất."]
    t0 = time.perf_counter()
    sc = reranker.rerank("Giá trị thặng dư là gì?", docs)
    print(f"  {time.perf_counter() - t0:.1f}s, điểm: {[round(x, 3) for x in sc]} (đoạn đúng nên cao nhất, đoạn lạc đề thấp nhất)")

    print("\n== 3. Tìm kiếm thật (hybrid_rerank)")
    for label, it in (("trong phạm vi", in_scope), ("ngoài phạm vi", out_scope)):
        t0 = time.perf_counter()
        res = hybrid.search(it["question"], store.Filters(subject=args.subject), top_k=3)
        print(f"  [{label}] {it['question'][:70]!r}\n    điểm cao nhất {res.max_score:.3f}, {time.perf_counter() - t0:.1f}s, "
              f"top1: {res.hits[0]['document']} tr.{res.hits[0]['page']}")
    store.close()
    openrouter.close()


if __name__ == "__main__":
    main()
