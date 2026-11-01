import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { ACTIVE_SUBJECTS } from "@/config/subjects";
import { MODE_IDS } from "@/features/chat/modes";
import { LABELS } from "@/features/chat/types";
import { CONTENT_ROOT } from "@/features/library/server/catalog";

import type { Suggestion } from "../types";

// Lời dặn riêng của môn cho trợ lý và câu hỏi gợi ý: content/<môn>/tro-ly.yaml (mẫu ở content/_mau-mon/).
// Mở môn mới chỉ cần file này cùng học liệu, không sửa prompt trong code (PLAN.md mục 8, giai đoạn 6).

const SuggestionSchema = z.object({ mode: z.enum(MODE_IDS), text: z.string().min(1) });

const ProfileSchema = z.object({
  lien_he: z.string().min(1),
  phan_loai: z.object({
    hop_le: z.string().min(1),
    ngoai_pham_vi: z.string().optional(),
    vi_du: z.array(z.object({ cau: z.string().min(1), nhan: z.enum(LABELS) })).default([]),
  }),
  goi_y: z.array(SuggestionSchema).default([]),
  chuong: z.record(z.coerce.number().int().positive(), z.array(SuggestionSchema)).default({}),
});

export interface AssistantProfile {
  /** Chế độ Liên hệ thực tiễn gợi ý ý nghĩa đối với nhiệm vụ này. */
  practiceFocus: string;
  classifier: {
    inScope: string;
    outOfScope?: string;
    examples: { question: string; label: (typeof LABELS)[number] }[];
  };
  suggestions: Suggestion[];
  chapterQuestions: Record<number, Suggestion[]>;
}

const cache = new Map<string, AssistantProfile>();

export function profilePath(subject: string): string {
  return path.join(CONTENT_ROOT, subject, "tro-ly.yaml");
}

/** Đọc và kiểm tra tro-ly.yaml của một môn. Thiếu file hoặc sai cấu trúc thì báo lỗi rõ chỗ sai. */
export function getProfile(subject: string): AssistantProfile {
  if (cache.has(subject) && process.env.NODE_ENV === "production") return cache.get(subject)!;

  const file = profilePath(subject);
  if (!fs.existsSync(file)) throw new Error(`Thiếu ${path.relative(CONTENT_ROOT, file)}, chép từ content/_mau-mon/tro-ly.yaml`);
  const parsed = ProfileSchema.safeParse(parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`${path.relative(CONTENT_ROOT, file)}: ${z.prettifyError(parsed.error)}`);

  const { lien_he, phan_loai, goi_y, chuong } = parsed.data;
  const profile: AssistantProfile = {
    practiceFocus: lien_he,
    classifier: {
      inScope: phan_loai.hop_le,
      outOfScope: phan_loai.ngoai_pham_vi,
      examples: phan_loai.vi_du.map((e) => ({ question: e.cau, label: e.nhan })),
    },
    suggestions: goi_y,
    chapterQuestions: chuong,
  };
  cache.set(subject, profile);
  return profile;
}

/** Câu gợi ý ở màn hình trống của trợ lý, theo từng môn đang mở, chỉ giữ câu thuộc chế độ môn đó có. */
export function suggestionsBySubject(): Record<string, Suggestion[]> {
  return Object.fromEntries(
    ACTIVE_SUBJECTS.map((s) => [s.id, getProfile(s.id).suggestions.filter((q) => s.modes.includes(q.mode)).slice(0, 4)]),
  );
}
