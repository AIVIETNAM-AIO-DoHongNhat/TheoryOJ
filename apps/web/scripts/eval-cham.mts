/**
 * Đo chất lượng chấm câu hỏi mở (PLAN.md mục 4.5 và 9) trên bộ bài mẫu eval/<môn>/cham-bai.jsonl:
 *   - mỗi bài có kỳ vọng (`expect`): khoảng điểm, có gắn cờ không, lập trường; đếm số bài đạt kỳ vọng;
 *   - bài có điểm giảng viên (`diem_gv`): Spearman, Pearson, sai lệch trung bình với điểm hệ thống;
 *   - số ý bị hạ mức vì đoạn trích không có trong bài làm (mô hình "bịa" ý của học viên);
 *   - thời gian chấm.
 *
 *   npm run eval-cham                    # cả bộ bài, cần DB có bảng chunks và mô hình ngôn ngữ
 *   npm run eval-cham -- --ids cb-01,cb-12
 *
 * Kết quả lưu ở eval/<môn>/results/cham-<thời điểm>.json. Bộ bài do người phát triển soạn (`status: nhap`);
 * giảng viên chấm và điền `diem_gv` để có số liệu đồng thuận cho hồ sơ.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { getSubject } from "@/config/subjects";
import { agreement, to10 } from "@/features/open-answer/agreement";
import { essayRubric, findRebuttal, getEssayBank, rebuttalRubric } from "@/features/open-answer/server/bank";
import { grade } from "@/features/open-answer/server/grade";
import type { GradedRubric, Stance } from "@/features/open-answer/types";
import { env } from "@/lib/env";

interface Sample {
  id: string;
  kind: "tu_luan" | "phan_bac";
  item: string;
  loai: string;
  answer: string;
  expect: { min?: number; max?: number; flagged?: boolean; stance?: Stance };
  /** Điểm giảng viên chấm, thang 10. */
  diem_gv: number | null;
  status: string;
}

const { values: args } = parseArgs({
  options: {
    subject: { type: "string", default: "ktct" },
    ids: { type: "string" },
  },
});

const REPO = resolve(process.cwd(), "../..");
const subject = getSubject(args.subject!);
if (!subject) throw new Error(`Không có môn ${args.subject}`);
let samples: Sample[] = readFileSync(resolve(REPO, `eval/${subject.id}/cham-bai.jsonl`), "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));
if (args.ids) {
  const ids = new Set(args.ids.split(","));
  samples = samples.filter((s) => ids.has(s.id));
}

function rubricOf(s: Sample): { rubric: GradedRubric; claim?: string } {
  if (s.kind === "tu_luan") {
    const chapter = Number(s.item.match(/^tl(\d+)-/)?.[1]);
    const q = getEssayBank(subject!.id, chapter)?.questions.find((x) => x.id === s.item);
    if (!q) throw new Error(`${s.id}: không có câu ${s.item}`);
    return { rubric: essayRubric(q) };
  }
  const found = findRebuttal(subject!.id, subject!.chapters.map((c) => c.number), s.item, true);
  if (!found) throw new Error(`${s.id}: không có luận điệu ${s.item}`);
  return { rubric: rebuttalRubric(found.item), claim: found.item.claim };
}

const results = [];
let met = 0;
let rejectedQuotes = 0;
const pairs: { ai: number; lecturer: number }[] = [];

for (const s of samples) {
  const { rubric, claim } = rubricOf(s);
  let row;
  try {
    const g = await grade({ subject, kind: s.kind, rubric, answer: s.answer, claim });
    const score10 = to10(g.result.score, g.result.maxScore);
    const fails: string[] = [];
    if (s.expect.min !== undefined && score10 < s.expect.min) fails.push(`điểm ${score10.toFixed(2)} < ${s.expect.min}`);
    if (s.expect.max !== undefined && score10 > s.expect.max) fails.push(`điểm ${score10.toFixed(2)} > ${s.expect.max}`);
    if (s.expect.flagged !== undefined && g.result.flagged !== s.expect.flagged) fails.push(`gắn cờ ${g.result.flagged}`);
    if (s.expect.stance && g.result.stance !== s.expect.stance) fails.push(`lập trường ${g.result.stance}`);
    const rejected = g.result.points.filter((p) => p.quoteRejected).length;
    rejectedQuotes += rejected;
    if (!fails.length) met++;
    if (s.diem_gv !== null) pairs.push({ ai: score10, lecturer: s.diem_gv });
    row = {
      id: s.id, loai: s.loai, item: s.item, score10, flagged: g.result.flagged, stance: g.result.stance,
      levels: Object.fromEntries(g.result.points.map((p) => [p.id, p.level])), rejected, fails, latencyMs: g.latencyMs,
      citations: g.citations.length,
    };
    console.log(`${fails.length ? "✗" : "✓"} ${s.id} ${s.loai.padEnd(14)} ${score10.toFixed(2).padStart(5)}/10  ${g.latencyMs} ms${fails.length ? `  ← ${fails.join("; ")}` : ""}`);
  } catch (error) {
    row = { id: s.id, loai: s.loai, item: s.item, error: String(error) };
    console.log(`! ${s.id} lỗi: ${error}`);
  }
  results.push(row);
}

const latencies = results.flatMap((r) => ("latencyMs" in r && r.latencyMs ? [r.latencyMs] : [])).sort((a, b) => a - b);
const summary = {
  model: env.LLM_MODEL,
  samples: samples.length,
  expectationsMet: met,
  expectationRate: samples.length ? met / samples.length : null,
  rejectedQuotes,
  agreement: agreement(pairs),
  latencyMedianMs: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
};
console.log("\n", summary);

const outDir = resolve(REPO, `eval/${subject.id}/results`);
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
const out = resolve(outDir, `cham-${stamp}.json`);
writeFileSync(out, JSON.stringify({ summary, results }, null, 2));
console.log(`Đã lưu ${out}`);
process.exit(0);
