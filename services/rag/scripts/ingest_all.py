"""Nạp mọi môn có manifest.yaml trong content/, hoặc chỉ các môn được nêu.

    python scripts/ingest_all.py                    # nạp tăng dần mọi môn
    python scripts/ingest_all.py ktct --force       # nhúng lại toàn bộ môn KTCT
    python scripts/ingest_all.py --skip-separate    # bỏ qua chỉ mục riêng (niên giám), nạp nhanh trên CPU
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ingest.pipeline import ingest_subject  # noqa: E402
from app.retrieval import store  # noqa: E402
from app.settings import get_settings  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("subjects", nargs="*", help="mã môn, mặc định là mọi thư mục có manifest.yaml")
    ap.add_argument("--force", action="store_true", help="nhúng lại kể cả file không đổi")
    ap.add_argument("--skip-separate", action="store_true", help="bỏ qua tài liệu có index: separate")
    args = ap.parse_args()

    root = get_settings().content_dir
    subjects = args.subjects or sorted(p.parent.name for p in root.glob("*/manifest.yaml"))
    if not subjects:
        raise SystemExit(f"Không thấy manifest.yaml nào trong {root}")

    for subject in subjects:
        t0 = time.time()
        report = ingest_subject(subject, force=args.force, skip_separate=args.skip_separate).as_dict()
        for s in report["skipped"]:
            print(f"!! {s['file']}: {s['reason']}")
        print(f"== {subject}: {report['total_chunks']} đoạn, {time.time() - t0:.0f} giây")
        print(json.dumps(report, ensure_ascii=False, indent=2), file=sys.stderr)
    store.close()


if __name__ == "__main__":
    main()
