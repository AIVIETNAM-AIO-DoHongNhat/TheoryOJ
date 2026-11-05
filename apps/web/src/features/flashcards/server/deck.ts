import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { CONTENT_ROOT } from "@/features/library/server/catalog";

import type { Flashcard } from "../types";

// Thẻ ghi nhớ: content/<môn>/the-ghi-nho/chuong-<n>.yaml (mẫu ở _mau.yaml). Giảng viên sửa file, không cần sửa code.

const CardSchema = z.object({
  id: z.string().min(1),
  loai: z.enum(["khai_niem", "cong_thuc"]).default("khai_niem"),
  front: z.string().min(1),
  back: z.string().min(1),
  page: z.number().int().positive().optional(),
});

const DeckSchema = z.object({
  subject: z.string(),
  chapter: z.number().int().positive(),
  status: z.enum(["nhap", "da-duyet"]).default("nhap"),
  cards: z.array(CardSchema),
});

export interface Deck {
  subject: string;
  chapter: number;
  reviewed: boolean;
  cards: Flashcard[];
}

const cache = new Map<string, Deck | null>();

/** Đọc và kiểm tra bộ thẻ của một chương. Null nếu chương chưa có file. File sai cấu trúc thì báo lỗi rõ chỗ sai. */
export function getDeck(subject: string, chapter: number): Deck | null {
  const key = `${subject}/${chapter}`;
  if (cache.has(key) && process.env.NODE_ENV === "production") return cache.get(key)!;

  const file = path.join(CONTENT_ROOT, subject, "the-ghi-nho", `chuong-${chapter}.yaml`);
  if (!fs.existsSync(file)) {
    cache.set(key, null);
    return null;
  }
  const parsed = DeckSchema.safeParse(parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`${path.relative(CONTENT_ROOT, file)}: ${z.prettifyError(parsed.error)}`);

  const ids = new Set<string>();
  const cards = parsed.data.cards.map((c): Flashcard => {
    if (ids.has(c.id)) throw new Error(`${key}: trùng mã thẻ ${c.id}`);
    ids.add(c.id);
    return { id: c.id, kind: c.loai, front: c.front.trim(), back: c.back.trim(), page: c.page };
  });
  const deck = { subject, chapter, reviewed: parsed.data.status === "da-duyet", cards };
  cache.set(key, deck);
  return deck;
}

/** Số thẻ của từng chương có bộ thẻ. */
export function deckCounts(subject: string, chapters: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const n of chapters) {
    const deck = getDeck(subject, n);
    if (deck?.cards.length) counts[n] = deck.cards.length;
  }
  return counts;
}
