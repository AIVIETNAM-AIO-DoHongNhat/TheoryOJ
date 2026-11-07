import { generateText, type LanguageModel } from "ai";
import { z } from "zod";

import { INTENTS, LABELS, type Intent, type Label } from "../types";
import { classify, detectInjection } from "./guardrails";
import { rewriteQuery, transcriptOf, type Turn } from "./rewrite-query";

/** Phạm vi tóm tắt do bộ định tuyến nhận ra. */
export type Scope =
  | { kind: "chuong"; chapters: number[] }
  | { kind: "trang"; from: number; to: number }
  | { kind: "van_kien"; document: string }
  | { kind: "hoi_thoai" }
  | { kind: "chu_de" };

export interface Route {
  label: Label;
  intent: Intent;
  scope: Scope | null;
  /** Câu tìm kiếm độc lập (đã thay đại từ bằng khái niệm cụ thể). */
  query: string;
  /** rule: luật chặn chèn lệnh; model: bộ định tuyến; fallback: bộ định tuyến lỗi, dùng luồng cũ. */
  source: "rule" | "model" | "fallback";
  raw?: string;
}

const MAX_PAGES = 40;

const scopeSchema = z.discriminatedUnion("loai", [
  z.object({ loai: z.literal("chuong"), chuong: z.array(z.coerce.number().int().positive()).min(1).max(2) }),
  z.object({ loai: z.literal("trang"), tu: z.coerce.number().int().positive(), den: z.coerce.number().int().positive() }),
  z.object({ loai: z.literal("van_kien"), ma: z.string().min(1) }),
  z.object({ loai: z.literal("hoi_thoai") }),
  z.object({ loai: z.literal("chu_de") }),
]);

const outputSchema = z.object({
  nhan: z.enum(LABELS),
  y_dinh: z.enum(INTENTS),
  pham_vi: z.unknown().optional(),
  truy_van: z.string().optional(),
});

/** Lấy đối tượng JSON đầu tiên trong đầu ra (mô hình đôi khi bọc trong ``` hay thêm chữ ở đầu). */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export interface RouteContext {
  /** Số chương có trong môn, để bỏ phạm vi chương không tồn tại. */
  chapterNumbers: number[];
  /** Mã tài liệu hợp lệ (đường dẫn trong chỉ mục). */
  documents: string[];
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

/**
 * Tìm văn kiện theo mã mô hình trả về. Mô hình hay trả tên ("Nghị quyết 68-NQ/TW") hay số hiệu ("68")
 * thay cho đường dẫn, nên ngoài khớp đúng còn khớp theo số hiệu văn bản trong đường dẫn. Chỉ nhận khi khớp duy nhất.
 */
export function resolveDocument(code: string, documents: string[]): string | null {
  if (documents.includes(code)) return code;
  const c = fold(code);
  const byPath = documents.filter((d) => fold(d).includes(c) || c.includes(fold(d)));
  if (byPath.length === 1) return byPath[0];
  // Số hiệu như "68-NQ/TW", "NQ 68", "68": so với số đứng trước "-NQ" hay sau "NQ-" trong tên file.
  const num = c.match(/\b(\d{1,3})\s*[-/]?\s*nq\b/)?.[1] ?? c.match(/\bnq\s*[-/]?\s*(\d{1,3})\b/)?.[1] ?? c.match(/^\s*(\d{1,3})\s*$/)?.[1];
  if (!num) return null;
  const byNumber = documents.filter((d) => new RegExp(`(^|[^\\d])${num}-nq|nq-${num}([^\\d]|$)`).test(fold(d)));
  if (byNumber.length === 1) return byNumber[0];
  // Cùng số hiệu với tài liệu hỏi đáp về nghị quyết đó: chọn bản văn kiện gốc.
  const original = byNumber.filter((d) => d.startsWith("van-kien/"));
  return original.length === 1 ? original[0] : null;
}

function toScope(value: unknown, ctx: RouteContext, hasHistory: boolean): Scope {
  const parsed = scopeSchema.safeParse(value);
  // Có ý định tóm tắt nhưng phạm vi đọc không được: tóm tắt theo chủ đề, nhờ tìm kiếm.
  if (!parsed.success) return { kind: "chu_de" };
  const s = parsed.data;
  switch (s.loai) {
    case "chuong": {
      const chapters = [...new Set(s.chuong)].filter((n) => ctx.chapterNumbers.includes(n));
      return chapters.length ? { kind: "chuong", chapters } : { kind: "chu_de" };
    }
    case "trang": {
      const from = Math.min(s.tu, s.den);
      const to = Math.min(Math.max(s.tu, s.den), from + MAX_PAGES - 1);
      return { kind: "trang", from, to };
    }
    case "van_kien": {
      const document = resolveDocument(s.ma, ctx.documents);
      return document ? { kind: "van_kien", document } : { kind: "chu_de" };
    }
    case "hoi_thoai":
      return hasHistory ? { kind: "hoi_thoai" } : { kind: "chu_de" };
    case "chu_de":
      return { kind: "chu_de" };
  }
}

/** Đọc đầu ra của bộ định tuyến. Sai cấu trúc thì trả null để dùng luồng cũ. */
export function parseRoute(text: string, ctx: RouteContext, question: string, hasHistory: boolean): Omit<Route, "source"> | null {
  const parsed = outputSchema.safeParse(extractJson(text));
  if (!parsed.success) return null;
  const { nhan, y_dinh, pham_vi, truy_van } = parsed.data;
  const query = truy_van?.trim();
  return {
    label: nhan,
    intent: y_dinh,
    scope: y_dinh === "tom_tat" ? toScope(pham_vi, ctx, hasHistory) : null,
    query: query && query.length >= 3 && query.length <= 500 ? query : question,
    raw: text,
  };
}

/**
 * Bước 2–3 của PLAN.md mục 3 gộp làm một: phân loại, nhận ý định và phạm vi, viết lại câu hỏi.
 * Luật chặn chèn lệnh chạy trước, không tốn lệnh gọi. Mô hình trả sai cấu trúc thì quay về hai bước cũ.
 */
export async function route(
  model: LanguageModel,
  prompts: { router: string; classifier: string },
  ctx: RouteContext,
  history: Turn[],
  question: string,
  abortSignal?: AbortSignal,
): Promise<Route> {
  if (detectInjection(question)) return { label: "chen_lenh", intent: "hoi_dap", scope: null, query: question, source: "rule" };

  const transcript = transcriptOf(history);
  const content = transcript ? `Hội thoại:\n${transcript}\n\nTin nhắn cuối: ${question}` : `Tin nhắn cuối: ${question}`;
  let text = "";
  try {
    ({ text } = await generateText({
      model,
      instructions: prompts.router,
      prompt: `"""${content.replaceAll('"""', '"')}"""\nJSON:`,
      temperature: 0,
      maxOutputTokens: 250,
      abortSignal,
    }));
  } catch (err) {
    if (abortSignal?.aborted) throw err;
    console.warn("Bộ định tuyến lỗi, dùng luồng cũ", err);
  }
  const parsed = text ? parseRoute(text, ctx, question, history.length > 0) : null;
  if (parsed) return { ...parsed, source: "model" };

  // Luồng cũ: viết lại câu hỏi rồi phân loại bằng một nhãn.
  const query = await rewriteQuery(model, history, question, abortSignal);
  const c = await classify(model, prompts.classifier, question, query, abortSignal);
  return { label: c.label, intent: "hoi_dap", scope: null, query, source: c.source === "model" ? "model" : "fallback", raw: text || c.raw };
}
