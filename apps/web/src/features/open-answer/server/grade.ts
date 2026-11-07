import "server-only";

import { generateText } from "ai";

import type { Subject } from "@/config/subjects";
import { shortTitle } from "@/features/chat/server/build-context";
import { detectInjection } from "@/features/chat/server/guardrails";
import type { Citation } from "@/features/chat/types";
import { env } from "@/lib/env";
import { chatModel, fastModel } from "@/lib/llm";
import { search } from "@/lib/rag-client";
import { fetchRange, type RangeChunk } from "@/lib/search/range";

import { detectGraderInjection, finalizeGrade, fold, parseGrade } from "../grading";
import type { AttemptKind, GradedRubric, GradeResult, RubricPoint } from "../types";
import { fallbackQuestion, followUpInstructions, followUpMessage, gradingInstructions, gradingMessage } from "./prompts";

// Lõi chấm câu hỏi mở (PLAN.md mục 4.5).
// 1. Lấy căn cứ xác định theo barem: đúng trang giáo trình, đúng văn kiện của từng ý (không phụ thuộc tìm kiếm).
// 2. Thêm vài đoạn tìm theo bài làm để đối chiếu khẳng định của học viên (bỏ qua nếu dịch vụ tìm kiếm lỗi).
// 3. Một lệnh gọi mô hình xếp mức từng ý; hậu kiểm và tính điểm bằng code (grading.ts).

/** Số đoạn lấy cho mỗi ý barem, số đoạn tìm theo bài làm, tổng số khối tài liệu tối đa. */
const PER_POINT = 2;
const FROM_ANSWER = 3;
const MAX_CITATIONS = 12;
const MAX_CHARS = 1800;

type Piece = Pick<RangeChunk, "text" | "document" | "document_title" | "kind" | "chapter" | "page" | "pdf_page" | "section">;

const words = (s: string) => new Set(fold(s).split(" ").filter((w) => w.length >= 3));

/** Xếp đoạn theo số từ chung với nội dung ý barem. */
function rankByOverlap<T extends Piece>(query: string, pieces: T[], take: number): T[] {
  const q = words(query);
  return pieces
    .map((p, i) => {
      let hit = 0;
      for (const w of words(p.text)) if (q.has(w)) hit++;
      return { p, hit, i };
    })
    .sort((a, b) => b.hit - a.hit || a.i - b.i)
    .slice(0, take)
    .map((x) => x.p);
}

async function piecesForPoint(subject: string, prompt: string, point: RubricPoint): Promise<Piece[]> {
  if (point.page) {
    const chunks = await fetchRange({ subject, kinds: ["giao_trinh"], pages: [point.page, point.page] });
    return rankByOverlap(point.y, chunks, PER_POINT);
  }
  if (point.document) {
    const chunks = await fetchRange({ subject, documents: [point.document] });
    return rankByOverlap(`${point.y} ${prompt}`, chunks, PER_POINT);
  }
  return [];
}

export interface Evidence {
  citations: Citation[];
  /** Mã ý → các [n] lấy cho ý đó. */
  hints: Map<string, number[]>;
}

export async function gatherEvidence(
  subject: Subject,
  rubric: GradedRubric,
  answer: string | null,
  signal?: AbortSignal,
): Promise<Evidence> {
  const citations: Citation[] = [];
  const index = new Map<string, number>();
  const hints = new Map<string, number[]>();

  const add = (p: Piece, score = 0): number | null => {
    const key = `${p.document}|${p.page ?? ""}|${p.text.slice(0, 80)}`;
    const known = index.get(key);
    if (known) return known;
    if (citations.length >= MAX_CITATIONS) return null;
    const n = citations.length + 1;
    citations.push({
      n,
      title: shortTitle(p, subject),
      document: p.document,
      kind: p.kind,
      chapter: p.chapter,
      page: p.page,
      pdfPage: p.pdf_page,
      section: p.section,
      text: p.text.length > MAX_CHARS ? `${p.text.slice(0, MAX_CHARS)}…` : p.text,
      score,
    });
    index.set(key, n);
    return n;
  };

  const perPoint = await Promise.all(rubric.points.map((p) => piecesForPoint(subject.id, rubric.prompt, p)));
  rubric.points.forEach((p, i) => {
    const ns = perPoint[i].map((piece) => add(piece)).filter((n): n is number => n !== null);
    if (ns.length) hints.set(p.id, ns);
  });

  if (answer) {
    try {
      const res = await search({ query: answer.slice(0, 1000), subject: subject.id, kinds: ["giao_trinh", "van_kien"], top_k: FROM_ANSWER }, signal);
      for (const h of res.hits) add(h, h.score);
    } catch (error) {
      console.warn("Chấm bài: không tìm được đoạn theo bài làm, chỉ dùng căn cứ của barem.", error);
    }
  }
  return { citations, hints };
}

export interface Graded {
  result: GradeResult;
  citations: Citation[];
  model: string;
  latencyMs: number;
}

export class GradingError extends Error {}

/** Chấm một bài. Mô hình trả sai cấu trúc hai lần thì báo lỗi (không lưu điểm 0 do lỗi của mô hình). */
export async function grade(input: {
  subject: Subject;
  kind: AttemptKind;
  rubric: GradedRubric;
  answer: string;
  /** Luận điệu cần phản bác. */
  claim?: string;
  signal?: AbortSignal;
}): Promise<Graded> {
  const t0 = performance.now();
  const { subject, kind, rubric, answer, claim, signal } = input;

  if (detectInjection(answer) || detectGraderInjection(answer)) {
    const result = finalizeGrade({ kind, rubric, answer, citationCount: 0, raw: null, claim });
    return {
      result: {
        ...result,
        score: 0,
        overall: "Bài làm có câu lệnh nhằm điều khiển hệ thống chấm nên không được chấm. Giảng viên sẽ xem bài này.",
        flagged: true,
        flagReason: "chen_lenh",
      },
      citations: [],
      model: "rule",
      latencyMs: Math.round(performance.now() - t0),
    };
  }

  const { citations, hints } = await gatherEvidence(subject, rubric, answer, signal);
  const instructions = gradingInstructions(subject, kind);
  const prompt = gradingMessage({ kind, rubric, citations, hints, answer });

  let raw = null;
  for (let attempt = 0; attempt < 2 && !raw; attempt++) {
    const { text } = await generateText({
      model: chatModel,
      instructions,
      prompt: attempt === 0 ? prompt : `${prompt}\n\nNhắc lại: chỉ trả về một đối tượng JSON đúng cấu trúc đã nêu.`,
      temperature: 0,
      maxOutputTokens: 2500,
      abortSignal: signal,
    });
    raw = parseGrade(text);
    if (!raw) console.warn("Chấm bài: mô hình trả sai cấu trúc.", text.slice(0, 500));
  }
  if (!raw) throw new GradingError("Hệ thống chấm chưa đọc được kết quả. Đồng chí thử nộp lại sau ít phút.");

  return {
    result: finalizeGrade({ kind, rubric, answer, citationCount: citations.length, raw, claim }),
    citations,
    model: env.LLM_MODEL,
    latencyMs: Math.round(performance.now() - t0),
  };
}

/** Câu hỏi vặn cho một ý còn thiếu. Mô hình lỗi thì dùng câu dựng từ nội dung ý. */
export async function followUpQuestion(subject: Subject, prompt: string, point: RubricPoint, signal?: AbortSignal): Promise<string> {
  try {
    const { citations } = await gatherEvidence(subject, { prompt, points: [point] }, null, signal);
    const { text } = await generateText({
      model: fastModel,
      instructions: followUpInstructions(subject),
      prompt: followUpMessage(prompt, point, citations),
      temperature: 0.3,
      maxOutputTokens: 120,
      abortSignal: signal,
    });
    const q = text.trim().replace(/^["“]|["”]$/g, "").split("\n")[0]?.trim();
    return q && q.length >= 10 && q.length <= 300 ? q : fallbackQuestion(point);
  } catch (error) {
    console.warn("Không tạo được câu hỏi vặn, dùng câu dự phòng.", error);
    return fallbackQuestion(point);
  }
}
