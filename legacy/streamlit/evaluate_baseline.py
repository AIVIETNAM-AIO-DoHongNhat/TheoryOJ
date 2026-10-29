"""Đo điểm nền của bản Streamlit trên eval/ktct/golden.jsonl.

    python legacy/streamlit/evaluate_baseline.py           # chỉ đo tìm kiếm (hit@5)
    python legacy/streamlit/evaluate_baseline.py --llm     # đo thêm từ chối và tính toán, cần Ollama

Dùng nguyên chỉ mục trong legacy/streamlit/db và hai prompt trong app.py, không sửa gì,
để kết quả phản ánh đúng hệ thống hiện tại. Trang trong chỉ mục cũ là trang PDF.
"""
import argparse
import ast
import collections
import datetime
import json
import re
import statistics
import sys
from pathlib import Path

import config
import rag

HERE = Path(__file__).parent
GOLDEN = Path(config.ROOT) / "eval" / "ktct" / "golden.jsonl"
RESULTS = Path(config.ROOT) / "eval" / "ktct" / "results"
REFUSAL = "giáo trình không đề cập"
NUMBER = re.compile(r"\d+(?:[.,\s]\d{3})*(?:,\d+)?")


def legacy_prompts():
    """Lấy SYSTEM_QA, SYSTEM_EX từ app.py mà không chạy Streamlit."""
    tree = ast.parse((HERE / "app.py").read_text(encoding="utf-8"))
    out = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
            if node.targets[0].id in ("SYSTEM_QA", "SYSTEM_EX"):
                out[node.targets[0].id] = ast.literal_eval(node.value)
    return out


def is_hit(hits, gold):
    for h in hits:
        for g in gold:
            lo, hi = g["pdf_pages"]
            if h["source"] == Path(g["document"]).name and lo <= h["page"] <= hi:
                return True
    return False


def numbers_in(text):
    vals = set()
    for raw in NUMBER.findall(text):
        s = re.sub(r"[.\s]", "", raw).replace(",", ".")
        try:
            vals.add(float(s))
        except ValueError:
            pass
    return vals


def ask_llm(client, system, question, hits):
    context = "\n\n".join(f"[{h['source']}, tr. {h['page']}]\n{h['text']}" for h in hits)
    res = client.chat.completions.create(
        model=config.LLM_MODEL, temperature=0.2,
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": f"TÀI LIỆU:\n{context}\n\nCÂU HỎI: {question}"}])
    return res.choices[0].message.content


def pct(n, d):
    return f"{n}/{d} ({100 * n / d:.0f} %)" if d else "–"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--llm", action="store_true", help="gọi mô hình ngôn ngữ để đo từ chối và tính toán")
    args = ap.parse_args()

    items = [json.loads(line) for line in GOLDEN.open(encoding="utf-8") if line.strip()]
    client = prompts = None
    if args.llm:
        from openai import OpenAI
        client = OpenAI(base_url=config.LLM_BASE_URL, api_key=config.LLM_API_KEY)
        prompts = legacy_prompts()

    rows = []
    for it in items:
        hits = rag.retrieve(it["question"], k=5)
        row = {"id": it["id"], "type": it["type"], "expect": it["expect"], "question": it["question"],
               "max_score": hits[0]["score"] if hits else 0.0,
               "hits": [{"source": h["source"], "page": h["page"], "score": h["score"]} for h in hits]}
        if "gold" in it:
            row["hit@5"] = is_hit(hits, it["gold"])
        if client:
            system = prompts["SYSTEM_EX"] if it["mode"] == "exercise" else prompts["SYSTEM_QA"]
            answer = ask_llm(client, system, it["question"], hits)
            row["answer"] = answer
            low = answer.lower()
            row["refused"] = REFUSAL in low
            # Lỗi số 7 trong PLAN.md: từ chối xong vẫn viết tiếp nội dung.
            row["refused_then_answered"] = row["refused"] and len(answer) > 200
            if it["type"] == "calc" and it["expect"] == "answer":
                found = numbers_in(answer)
                row["calc_correct"] = all(float(v) in found for v in it["answer"].values())
            if it["expect"] == "missing_data":
                row["calc_correct"] = "thiếu" in low
        rows.append(row)
        print(f"{it['id']} {it['type']:<12} max={row['max_score']:.3f} hit={row.get('hit@5', '-')}", file=sys.stderr)

    # ---------- Tổng hợp ----------
    scoped = [r for r in rows if "hit@5" in r]
    summary = {"hit@5": pct(sum(r["hit@5"] for r in scoped), len(scoped))}
    by_chapter = collections.defaultdict(list)
    for it, r in zip(items, rows):
        if "hit@5" in r:
            by_chapter[it["chapter"]].append(r["hit@5"])
    summary["hit@5_by_chapter"] = {c: pct(sum(v), len(v)) for c, v in sorted(by_chapter.items())}

    top_sources = collections.Counter(h["source"] for r in scoped for h in r["hits"])
    summary["sources_in_top5_for_in_scope"] = dict(top_sources.most_common())

    for t in ("theory", "calc", "out_of_scope", "provocative"):
        s = [r["max_score"] for r in rows if r["type"] == t]
        if s:
            summary[f"max_score_{t}"] = {"min": min(s), "median": statistics.median(s), "max": max(s)}

    if client:
        refuse = [r for r in rows if r["expect"] == "refuse"]
        answer = [r for r in rows if r["expect"] == "answer"]
        calc = [r for r in rows if "calc_correct" in r]
        summary["refusal_correct"] = pct(sum(r["refused"] for r in refuse), len(refuse))
        summary["false_refusal_in_scope"] = pct(sum(r["refused"] for r in answer), len(answer))
        summary["refused_then_answered"] = pct(sum(r["refused_then_answered"] for r in rows), len(rows))
        summary["calc_correct"] = pct(sum(r["calc_correct"] for r in calc), len(calc))

    RESULTS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    out = RESULTS / f"baseline-streamlit-{stamp}.json"
    meta = {"system": "legacy/streamlit", "embed_model": config.EMBED_MODEL, "top_k": 5,
            "llm_model": config.LLM_MODEL if client else None, "index_size": rag.collection().count(),
            "golden_items": len(items), "golden_status": dict(collections.Counter(i["status"] for i in items))}
    out.write_text(json.dumps({"meta": meta, "summary": summary, "rows": rows}, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(json.dumps({"meta": meta, "summary": summary}, ensure_ascii=False, indent=2))
    print(f"\nChi tiết: {out}")


if __name__ == "__main__":
    main()
