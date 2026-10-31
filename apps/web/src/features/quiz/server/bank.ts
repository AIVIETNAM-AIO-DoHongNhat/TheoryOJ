import "server-only";

import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { CONTENT_ROOT } from "@/features/library/server/catalog";

import { QUIZ_SIZE, type QuizQuestion } from "../types";

// Ngân hàng trắc nghiệm: content/<môn>/question-bank/chuong-<n>.yaml (mẫu ở _mau.yaml).
// Giảng viên sửa file, không cần chạm vào code. Đáp án ghi bằng chữ cái theo thứ tự phương án trong file.

const LETTERS = "ABCDEF";

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

export interface BankQuestion {
  id: string;
  q: string;
  options: string[];
  /** Vị trí đáp án đúng trong `options`. */
  answer: number;
  explain: string;
  page?: number;
}

export interface QuizBank {
  subject: string;
  chapter: number;
  reviewed: boolean;
  questions: BankQuestion[];
}

const cache = new Map<string, QuizBank | null>();

function bankPath(subject: string, chapter: number): string {
  return path.join(CONTENT_ROOT, subject, "question-bank", `chuong-${chapter}.yaml`);
}

/** Đọc và kiểm tra ngân hàng câu hỏi của một chương. Null nếu chương chưa có file. File sai cấu trúc thì báo lỗi rõ chỗ sai. */
export function getQuizBank(subject: string, chapter: number): QuizBank | null {
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

/** Số câu của từng chương có ngân hàng câu hỏi. */
export function quizCounts(subject: string, chapters: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const n of chapters) {
    const bank = getQuizBank(subject, n);
    if (bank?.questions.length) counts[n] = bank.questions.length;
  }
  return counts;
}

function shuffle<T>(items: T[]): T[] {
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
