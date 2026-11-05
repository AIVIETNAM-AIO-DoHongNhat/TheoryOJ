/**
 * So tìm kiếm trong Next.js (src/lib/search) với dịch vụ services/rag trên cùng câu hỏi và cùng cơ sở dữ liệu.
 * Hai bên phải cùng mô hình embedding và rerank (EMBED_MODEL, RERANK_MODEL ở web; EMBED_PROVIDER=openrouter ở rag).
 *
 *   npm run so-sanh-tim-kiem -- --rag http://127.0.0.1:8011 --n 12
 *
 * Mỗi câu gọi một lần rerank cho mỗi bên, nên --n lớn thì tốn thêm vài cent trên OpenRouter.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { searchInProcess } from "@/lib/search/hybrid";
import type { Hit } from "@/lib/search/types";

const { values: args } = parseArgs({
  options: { rag: { type: "string", default: "http://127.0.0.1:8011" }, n: { type: "string", default: "12" }, subject: { type: "string", default: "ktct" } },
});

interface Item { id: string; type: string; question: string; mode?: string }
const REPO = resolve(process.cwd(), "../..");
const all: Item[] = readFileSync(resolve(REPO, `eval/${args.subject}/golden.jsonl`), "utf8")
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

// Lấy đều các loại câu: lý thuyết, tính toán, ngoài phạm vi, khiêu khích.
const n = Number(args.n);
const byType = new Map<string, Item[]>();
for (const it of all) byType.set(it.type, [...(byType.get(it.type) ?? []), it]);
const picked: Item[] = [];
for (let i = 0; picked.length < n && i < all.length; i++) {
  for (const list of byType.values()) if (list[i] && picked.length < n) picked.push(list[i]);
}

const key = (h: Pick<Hit, "document" | "pdf_page" | "section" | "text">) => `${h.document}|${h.pdf_page ?? ""}|${h.section ?? ""}|${h.text.slice(0, 40)}`;

let identicalTop5 = 0, sameTop1 = 0, maxDiff = 0;
for (const it of picked) {
  const body = { query: it.question, subject: args.subject, top_k: 5 };
  const [ours, theirs] = await Promise.all([
    searchInProcess(body),
    fetch(`${args.rag}/search`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
  ]);
  const a = ours.hits.map(key), b = (theirs.hits as Hit[]).map(key);
  const same5 = a.length === b.length && a.every((k, i) => k === b[i]);
  const same1 = a[0] === b[0];
  const diff = Math.abs(ours.max_score - theirs.max_score);
  identicalTop5 += same5 ? 1 : 0; sameTop1 += same1 ? 1 : 0; maxDiff = Math.max(maxDiff, diff);
  console.log(`${it.id} ${it.type.padEnd(12)} top5 ${same5 ? "giống" : "KHÁC"} top1 ${same1 ? "giống" : "KHÁC"} max ${ours.max_score.toFixed(3)} vs ${theirs.max_score.toFixed(3)}`);
}
console.log(`\nTop-5 giống hệt: ${identicalTop5}/${picked.length}; top-1 giống: ${sameTop1}/${picked.length}; chênh điểm cao nhất lớn nhất: ${maxDiff.toFixed(4)}`);
process.exit(0);
