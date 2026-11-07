import "server-only";

import fs from "node:fs";
import path from "node:path";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { parse } from "yaml";
import { z } from "zod";

import { CONTENT_ROOT } from "@/features/library/server/catalog";
import { db, schema } from "@/lib/db";

import { type BankEdits, mergeBank, type QuizBank } from "../merge";
import { QUIZ_SIZE, type QuizQuestion } from "../types";

export type { BankEdits, BankQuestion, QuestionEdit, QuizBank } from "../merge";

// Ngân hàng trắc nghiệm của một chương = câu trong content/<môn>/question-bank/chuong-<n>.yaml (mẫu ở _mau.yaml)
// ghép với câu giảng viên soạn, sửa, ẩn ở /quan-tri/cau-hoi (bảng quiz_questions). Đáp án trong file ghi bằng chữ cái
// theo thứ tự phương án; trong bảng ghi bằng vị trí.

const LETTERS = "ABCDEF";

/** Tag của dữ liệu ngân hàng câu hỏi trong bộ đệm. Server Action sửa câu hỏi gọi updateTag với tag này. */
export const QUIZ_BANK_TAG = "ngan-hang-cau-hoi";

const QuestionSchema = z.object({
  id: z.string().min(1),
  q: z.string().min(1),
  options: z.array(z.coerce.string().min(1)).min(2).max(LETTERS.length),
  answer: z.string().regex(/^[A-F]$/),
  explain: z.string().min(1),
  page: z.number().int().positive().optional(),
});

const BankSchema = z.object({
  subject: z.string(),
  chapter: z.number().int().positive(),
  /** `nhap`: người phát triển soạn, chờ giảng viên duyệt; `da-duyet`: giảng viên đã duyệt. */
  status: z.enum(["nhap", "da-duyet"]).default("nhap"),
  questions: z.array(QuestionSchema),
});

const cache = new Map<string, QuizBank | null>();

function bankPath(subject: string, chapter: number): string {
  return path.join(CONTENT_ROOT, subject, "question-bank", `chuong-${chapter}.yaml`);
}

/**
 * Ngân hàng trong file của một chương, chưa ghép chỉnh sửa của giảng viên. Null nếu chương chưa có file.
 * File sai cấu trúc thì báo lỗi rõ chỗ sai.
 */
export function getContentBank(subject: string, chapter: number): QuizBank | null {
  const key = `${subject}/${chapter}`;
  if (cache.has(key) && process.env.NODE_ENV === "production") return cache.get(key)!;

  const file = bankPath(subject, chapter);
  if (!fs.existsSync(file)) {
    cache.set(key, null);
    return null;
  }
  const parsed = BankSchema.safeParse(parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`${path.relative(CONTENT_ROOT, file)}: ${z.prettifyError(parsed.error)}`);

  const ids = new Set<string>();
  const questions = parsed.data.questions.map((q) => {
    const answer = LETTERS.indexOf(q.answer);
    if (answer >= q.options.length) throw new Error(`${key} câu ${q.id}: đáp án ${q.answer} không có trong phương án`);
    if (ids.has(q.id)) throw new Error(`${key}: trùng mã câu ${q.id}`);
    ids.add(q.id);
    return { id: q.id, q: q.q, options: q.options, answer, explain: q.explain, page: q.page };
  });
  const bank = { subject, chapter, reviewed: parsed.data.status === "da-duyet", questions };
  cache.set(key, bank);
  return bank;
}

/** Đọc thẳng từ DB, không qua bộ đệm. Trang quản trị và lúc chép câu vào đề thi dùng hàm này. */
export async function loadBankEdits(subject: string): Promise<BankEdits> {
  const [rows, reviews] = await Promise.all([
    db
      .select({
        chapter: schema.quizQuestions.chapter,
        code: schema.quizQuestions.code,
        q: schema.quizQuestions.q,
        options: schema.quizQuestions.options,
        answer: schema.quizQuestions.answer,
        explain: schema.quizQuestions.explain,
        page: schema.quizQuestions.page,
        hidden: schema.quizQuestions.hidden,
      })
      .from(schema.quizQuestions)
      .where(eq(schema.quizQuestions.subject, subject))
      .orderBy(schema.quizQuestions.chapter, schema.quizQuestions.id),
    db
      .select({ chapter: schema.quizChapterReviews.chapter, reviewed: schema.quizChapterReviews.reviewed })
      .from(schema.quizChapterReviews)
      .where(eq(schema.quizChapterReviews.subject, subject)),
  ]);
  return { questions: rows, reviews: Object.fromEntries(reviews.map((r) => [r.chapter, r.reviewed])) };
}

/**
 * Bản trong bộ đệm cho trang học viên, kể cả trang dựng tĩnh. Sửa câu hỏi thì Server Action làm mới tag.
 * Không đọc được DB (ví dụ lúc build không có DB) thì dùng ngân hàng trong file và thử lại sau ít phút.
 */
async function cachedBankEdits(subject: string): Promise<BankEdits> {
  "use cache";
  cacheTag(QUIZ_BANK_TAG);
  try {
    const edits = await loadBankEdits(subject);
    cacheLife("hours");
    return edits;
  } catch (error) {
    console.warn(`Chưa đọc được chỉnh sửa ngân hàng câu hỏi môn ${subject}, tạm dùng câu trong content/:`, error);
    cacheLife("minutes");
    return { questions: [], reviews: {} };
  }
}

/** Ngân hàng câu hỏi của một chương dùng cho học viên. Null nếu chương chưa có câu nào. */
export async function getQuizBank(subject: string, chapter: number): Promise<QuizBank | null> {
  return mergeBank(subject, chapter, getContentBank(subject, chapter), await cachedBankEdits(subject));
}

/** Số câu của từng chương có ngân hàng câu hỏi. */
export async function quizCounts(subject: string, chapters: number[]): Promise<Record<number, number>> {
  const edits = await cachedBankEdits(subject);
  const counts: Record<number, number> = {};
  for (const n of chapters) {
    const bank = mergeBank(subject, n, getContentBank(subject, n), edits);
    if (bank?.questions.length) counts[n] = bank.questions.length;
  }
  return counts;
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Một đề: chọn ngẫu nhiên QUIZ_SIZE câu, trộn thứ tự phương án, bỏ đáp án và giải thích. */
export function drawQuiz(bank: QuizBank): QuizQuestion[] {
  return shuffle(bank.questions).slice(0, QUIZ_SIZE).map((q) => ({
    id: q.id,
    q: q.q,
    options: shuffle(q.options.map((text, key) => ({ key, text }))),
  }));
}
