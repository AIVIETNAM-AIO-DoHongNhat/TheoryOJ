/**
 * Đo tiêu chí hoàn thành giai đoạn 2 (PLAN.md mục 8) trên bộ câu chuẩn eval/<môn>/golden.jsonl:
 *   - từ chối đúng câu ngoài phạm vi và câu khiêu khích (mục tiêu từ 90 %),
 *   - không từ chối nhầm câu trong phạm vi,
 *   - bài tập đúng về số (mục tiêu 100 %): so giá trị do công cụ tinh_ktct trả về với `answer`,
 *   - câu thuộc môn mà giáo trình không có (`general`): được trả lời, có nhãn kiến thức chung,
 *   - yêu cầu tóm tắt (`summary`): nhận đúng ý định và phạm vi, bản tóm tắt phủ `key_points`,
 *   - chào hỏi (`chat`): nhận đúng, không tìm kiếm.
 *
 *   npm run eval                       # cả bộ câu, cần dịch vụ rag và mô hình ngôn ngữ đang chạy
 *   npm run eval -- --ids ktct-015,ktct-041
 *   npm run eval -- --answers          # sinh câu trả lời cho cả câu lý thuyết để chấm tay
 *
 * Kết quả lưu ở eval/<môn>/results/chat-<thời điểm>.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { generateText } from "ai";

import type { Quantity, Values } from "@/domain/ktct/formulas";
import type { ModeId } from "@/features/chat/modes";
import { answerSettings, cannedAnswer, prepare, type ChatInput } from "@/features/chat/server/pipeline";
import type { Scope } from "@/features/chat/server/router";
import type { Turn } from "@/features/chat/server/rewrite-query";
import { env } from "@/lib/env";

interface GoldenItem {
  id: string;
  type: "theory" | "calc" | "out_of_scope" | "provocative" | "general" | "summary" | "chat";
  mode: ModeId;
  expect: "answer" | "missing_data" | "refuse" | "general" | "summary" | "chat";
  question: string;
  chapter?: number;
  answer?: Record<string, number>;
  scope?: Scope;
  key_points?: string[];
  history?: Turn[];
  status: string;
}

const { values: args } = parseArgs({
  options: {
    subject: { type: "string", default: "ktct" },
    ids: { type: "string" },
    answers: { type: "boolean", default: false },
  },
});

const REPO = resolve(process.cwd(), "../..");
const subject = args.subject!;
let items: GoldenItem[] = readFileSync(resolve(REPO, `eval/${subject}/golden.jsonl`), "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));
if (args.ids) {
  const ids = new Set(args.ids.split(","));
  items = items.filter((it) => ids.has(it.id));
}

/** Khóa trong `answer` của golden ("p'", "m'_truoc") sang tên đại lượng của formulas.ts. */
function toQuantity(key: string): Quantity {
  const base = key.replace(/_(truoc|sau)$/, "");
  return ({ "m'": "m_rate", "p'": "p_rate" } as Record<string, Quantity>)[base] ?? (base as Quantity);
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-4);

/** Bỏ dấu phân cách hàng nghìn ("1.200.000", "1 200 000") để tìm số trong câu trả lời. */
function textHasNumber(text: string, x: number): boolean {
  const flat = text.replace(/(\d)[.\s ](?=\d{3}(?!\d))/g, "$1");
  return new RegExp(`(?<![\\d.,])${String(x).replace(".", "[.,]")}(?![\\d]|[.,]\\d)`).test(flat);
}

/** Phạm vi đúng: cùng loại, và cùng chương, trang hay văn kiện nếu có. */
function sameScope(got: Scope | null, want: Scope): boolean {
  if (!got || got.kind !== want.kind) return false;
  if (want.kind === "chuong" && got.kind === "chuong") return want.chapters.join() === got.chapters.join();
  if (want.kind === "trang" && got.kind === "trang") return want.from === got.from && want.to === got.to;
  if (want.kind === "van_kien" && got.kind === "van_kien") return want.document === got.document;
  return true;
}

const norm = (s: string) => s.toLowerCase().normalize("NFC").replace(/[^p{L}p{N}s]/gu, " ");

/** Tỷ lệ `key_points` có trong câu trả lời: một ý tính là có khi ít nhất 70 % số từ của nó xuất hiện. */
function keyPointCoverage(text: string, points: string[]): number | null {
  if (!points.length) return null;
  const words = new Set(norm(text).split(/s+/).filter(Boolean));
  const hit = points.filter((p) => {
    const w = norm(p).split(/s+/).filter(Boolean);
    return w.filter((x) => words.has(x)).length >= Math.ceil(0.7 * w.length);
  });
  return hit.length / points.length;
}

interface Row {
  id: string;
  type: GoldenItem["type"];
  expect: GoldenItem["expect"];
  label: string;
  intent?: string;
  grounding?: string | null;
  scope?: Scope | null;
  scopeOk?: boolean;
  coverage?: number | null;
  refused: string | null;
  maxScore: number | null;
  query: string;
  correct: boolean;
  timings: object;
  answerMs?: number;
  calc?: { expected: Record<string, number>; toolValues: Values[]; numbersOk: boolean; textOk: boolean; missing: string[] };
  text?: string;
  error?: string;
}

const rows: Row[] = [];
for (const it of items) {
  const input: ChatInput = { subject, mode: it.mode, history: it.history ?? [], question: it.question };
  try {
    const decision = await prepare(input);
    const refused = decision.type === "refuse" ? decision.reason : null;
    const grounding = decision.type === "answer" ? decision.grounding : null;
    const row: Row = {
      id: it.id, type: it.type, expect: it.expect, label: decision.label, intent: decision.intent, grounding, scope: decision.scope,
      refused, maxScore: decision.maxScore, query: decision.query, timings: decision.timings,
      correct: it.expect === "refuse" ? refused !== null : refused === null,
    };
    if (it.expect === "answer" || it.expect === "missing_data") row.correct &&= decision.intent === "hoi_dap";
    if (it.expect === "chat") row.correct &&= decision.intent === "tro_chuyen";
    if (it.expect === "summary") {
      row.scopeOk = !!it.scope && sameScope(decision.scope, it.scope);
      row.correct &&= decision.intent === "tom_tat" && row.scopeOk;
    }

    const wantText = it.type === "calc" || it.type === "summary" || args.answers;
    if (decision.type === "answer" && wantText) {
      const t0 = performance.now();
      const fixed = cannedAnswer(decision);
      const result = fixed === null ? await generateText(answerSettings(input, decision)) : null;
      row.answerMs = Math.round(performance.now() - t0);
      row.text = result?.text ?? fixed ?? "";
      if (it.key_points) row.coverage = keyPointCoverage(row.text, it.key_points);
      if (it.type === "calc" && result) {
        const outputs = result.steps.flatMap((s) => s.toolResults).map((r) => r.output as {
          ket_qua: Values; thieu_du_kien: string[];
        });
        const toolValues = outputs.map((o) => o.ket_qua);
        const missing = outputs.flatMap((o) => o.thieu_du_kien);
        const expected = it.answer ?? {};
        const numbersOk = it.expect === "missing_data"
          ? missing.length > 0 || toolValues.every((v) => v.p_rate === undefined)
          : Object.entries(expected).every(([k, x]) => toolValues.some((v) => {
              const got = v[toQuantity(k)];
              return got !== undefined && close(got, x);
            }));
        const textOk = Object.values(expected).every((x) => textHasNumber(result.text, x));
        row.calc = { expected, toolValues, numbersOk, textOk, missing };
        row.correct &&= numbersOk;
      }
    }
    rows.push(row);
    console.log(
      `${it.id} ${it.type.padEnd(12)} ${row.correct ? "ĐÚNG" : "SAI "} nhãn=${row.label} ý_định=${row.intent}` +
      (row.scope ? ` phạm_vi=${JSON.stringify(row.scope)}` : "") + (row.grounding ? ` căn_cứ=${row.grounding}` : "") +
      (row.coverage != null ? ` phủ_ý=${Math.round(row.coverage * 100)}%` : "") +
      ` từ_chối=${refused ?? "-"} max=${row.maxScore?.toFixed(3) ?? "-"}` +
      (row.calc ? ` số=${row.calc.numbersOk ? "đúng" : "sai"} chữ=${row.calc.textOk ? "đúng" : "sai"}` : ""),
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    rows.push({ id: it.id, type: it.type, expect: it.expect, label: "-", refused: null, maxScore: null, query: "", timings: {}, correct: false, error });
    console.log(`${it.id} LỖI ${error}`);
  }
}

const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)} %)` : "–");
const count = (f: (r: Row) => boolean) => rows.filter(f).length;
const refuseRows = rows.filter((r) => r.expect === "refuse");
const inScope = rows.filter((r) => r.expect === "answer" || r.expect === "missing_data");
const calc = rows.filter((r) => r.type === "calc");
const general = rows.filter((r) => r.type === "general");
const summaries = rows.filter((r) => r.type === "summary");
const coverages = summaries.map((r) => r.coverage).filter((c): c is number => c != null);

const summary = {
  model: env.LLM_MODEL,
  fastModel: env.LLM_FAST_MODEL ?? env.LLM_MODEL,
  threshold: env.REFUSAL_THRESHOLD,
  generalFloor: env.GENERAL_FLOOR,
  generalAnswers: env.CHAT_GENERAL_ANSWERS,
  refusal: pct(count((r) => r.expect === "refuse" && r.correct), refuseRows.length),
  refusalOutOfScope: pct(count((r) => r.type === "out_of_scope" && r.correct), count((r) => r.type === "out_of_scope")),
  refusalProvocative: pct(count((r) => r.type === "provocative" && r.correct), count((r) => r.type === "provocative")),
  falseRefusal: pct(count((r) => inScope.includes(r) && r.refused !== null), inScope.length),
  calcNumbers: pct(count((r) => r.type === "calc" && r.correct), calc.length),
  calcText: pct(count((r) => r.type === "calc" && !!r.calc?.textOk), calc.length),
  generalAnswered: pct(count((r) => r.type === "general" && r.refused === null), general.length),
  generalLabeled: pct(count((r) => r.type === "general" && (r.grounding === "mot_phan" || r.grounding === "kien_thuc_chung")), general.length),
  summaryIntent: pct(count((r) => r.type === "summary" && r.intent === "tom_tat"), summaries.length),
  summaryScope: pct(count((r) => r.type === "summary" && !!r.scopeOk), summaries.length),
  summaryCoverage: coverages.length ? `${Math.round((100 * coverages.reduce((a, b) => a + b, 0)) / coverages.length)} %` : "–",
  chat: pct(count((r) => r.type === "chat" && r.correct), count((r) => r.type === "chat")),
  errors: count((r) => !!r.error),
};

console.log("\nKết quả");
for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(20)} ${v}`);

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
const outDir = resolve(REPO, `eval/${subject}/results`);
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, `chat-${stamp}.json`);
writeFileSync(out, JSON.stringify({ summary, rows }, null, 2));
console.log(`\nĐã lưu ${out}`);
