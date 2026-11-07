import "server-only";

import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { CONTENT_ROOT, getLibrary } from "@/features/library/server/catalog";

import { AXES, type Axis, type GradedRubric, type PublishedRebuttal, type RubricPoint } from "../types";

// Ngân hàng câu hỏi mở của một chương:
// - tự luận: content/<môn>/tu-luan/chuong-<n>.yaml (mẫu ở _mau.yaml);
// - luận điệu cần phản bác: content/<môn>/phan-bac/chuong-<n>.yaml (mẫu ở _mau.yaml).
// Người phát triển soạn nháp (`status: nhap`), giảng viên duyệt rồi đổi thành `da-duyet`.

const pointSchema = z.object({
  id: z.string().min(1),
  y: z.string().min(1),
  diem: z.number().positive(),
  page: z.number().int().positive().nullish(),
  document: z.string().nullish(),
});

const statusSchema = z.enum(["nhap", "da-duyet"]).default("nhap");

const essayFileSchema = z.object({
  subject: z.string(),
  chapter: z.number().int().positive(),
  status: statusSchema,
  questions: z.array(z.object({
    id: z.string().min(1),
    q: z.string().min(1),
    rubric: z.array(pointSchema).min(2),
  })),
});

const rebuttalFileSchema = z.object({
  subject: z.string(),
  chapter: z.number().int().positive(),
  status: statusSchema,
  items: z.array(z.object({
    id: z.string().min(1),
    /** Duyệt riêng từng luận điệu; bỏ trống thì theo `status` của cả file. */
    status: z.enum(["nhap", "da-duyet"]).optional(),
    /** Tên ngắn để hiện trong danh sách. */
    tieu_de: z.string().min(1),
    luan_dieu: z.string().min(1),
    /** Bài phản bác đã công bố trên báo, tạp chí chính thống. Bắt buộc: không đưa luận điệu không có nguồn phản bác. */
    nguon_phan_bac: z.array(z.object({
      ten: z.string().min(1),
      bao: z.string().min(1),
      ngay: z.coerce.string().optional(),
      url: z.url(),
    })).min(1),
    ngay_bien: z.array(z.string().min(1)).default([]),
    rubric: z.object({
      ly_luan: z.array(pointSchema).min(1),
      van_kien: z.array(pointSchema).default([]),
      thuc_tien: z.array(pointSchema).default([]),
    }),
  })),
});

export interface EssayQuestion {
  id: string;
  q: string;
  rubric: RubricPoint[];
}

export interface EssayBank {
  subject: string;
  chapter: number;
  reviewed: boolean;
  questions: EssayQuestion[];
}

export interface RebuttalItem {
  id: string;
  /** Giảng viên đã duyệt: học viên thấy được. */
  reviewed: boolean;
  title: string;
  claim: string;
  published: PublishedRebuttal[];
  fallacies: string[];
  rubric: RubricPoint[];
}

export interface RebuttalBank {
  subject: string;
  chapter: number;
  /** Mọi luận điệu của chương đều đã duyệt. */
  reviewed: boolean;
  items: RebuttalItem[];
}

const cache = new Map<string, unknown>();

function readYaml<T>(file: string, schema: z.ZodType<T>): T | null {
  const key = file;
  if (cache.has(key) && process.env.NODE_ENV === "production") return cache.get(key) as T | null;
  if (!fs.existsSync(file)) {
    cache.set(key, null);
    return null;
  }
  const parsed = schema.safeParse(parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`${path.relative(CONTENT_ROOT, file)}: ${z.prettifyError(parsed.error)}`);
  cache.set(key, parsed.data);
  return parsed.data;
}

/** Kiểm tra mã ý không trùng và văn kiện có trong thư viện của môn. */
function checkPoints(where: string, subject: string, points: RubricPoint[]) {
  const documents = new Set(getLibrary().filter((d) => d.subject === subject).map((d) => d.file));
  const ids = new Set<string>();
  for (const p of points) {
    if (ids.has(p.id)) throw new Error(`${where}: trùng mã ý ${p.id}`);
    ids.add(p.id);
    if (p.document && !documents.has(p.document)) throw new Error(`${where} ý ${p.id}: không có văn kiện ${p.document} trong manifest`);
  }
}

function checkUnique(where: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${where}: trùng mã ${id}`);
    seen.add(id);
  }
}

export function getEssayBank(subject: string, chapter: number): EssayBank | null {
  const file = path.join(CONTENT_ROOT, subject, "tu-luan", `chuong-${chapter}.yaml`);
  const data = readYaml(file, essayFileSchema);
  if (!data) return null;
  const where = `${subject}/tu-luan/chuong-${chapter}`;
  checkUnique(where, data.questions.map((q) => q.id));
  for (const q of data.questions) checkPoints(`${where} câu ${q.id}`, subject, q.rubric);
  return { subject, chapter, reviewed: data.status === "da-duyet", questions: data.questions };
}

export function getRebuttalBank(subject: string, chapter: number): RebuttalBank | null {
  const file = path.join(CONTENT_ROOT, subject, "phan-bac", `chuong-${chapter}.yaml`);
  const data = readYaml(file, rebuttalFileSchema);
  if (!data) return null;
  const where = `${subject}/phan-bac/chuong-${chapter}`;
  checkUnique(where, data.items.map((i) => i.id));
  const items = data.items.map((i) => {
    const rubric = AXES.flatMap((axis: Axis) => i.rubric[axis].map((p) => ({ ...p, axis })));
    checkPoints(`${where} luận điệu ${i.id}`, subject, rubric);
    const reviewed = (i.status ?? data.status) === "da-duyet";
    return { id: i.id, reviewed, title: i.tieu_de, claim: i.luan_dieu, published: i.nguon_phan_bac, fallacies: i.ngay_bien, rubric };
  });
  return { subject, chapter, reviewed: items.every((i) => i.reviewed), items };
}

/** Mọi luận điệu của môn, theo chương. Học viên chỉ thấy luận điệu đã duyệt; giảng viên thấy cả bản nháp. */
export function rebuttalBanks(subject: string, chapters: number[], includeDrafts: boolean): RebuttalBank[] {
  return chapters
    .map((n) => getRebuttalBank(subject, n))
    .filter((b): b is RebuttalBank => !!b)
    .map((b) => (includeDrafts ? b : { ...b, items: b.items.filter((i) => i.reviewed) }))
    .filter((b) => b.items.length > 0);
}

export function findRebuttal(subject: string, chapters: number[], id: string, includeDrafts: boolean) {
  for (const bank of rebuttalBanks(subject, chapters, includeDrafts)) {
    const item = bank.items.find((i) => i.id === id);
    if (item) return { bank, item };
  }
  return null;
}

/** Số câu tự luận của từng chương có ngân hàng. */
export function essayCounts(subject: string, chapters: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const n of chapters) {
    const bank = getEssayBank(subject, n);
    if (bank?.questions.length) counts[n] = bank.questions.length;
  }
  return counts;
}

export function essayRubric(q: EssayQuestion): GradedRubric {
  return { prompt: q.q, points: q.rubric };
}

export function rebuttalRubric(item: RebuttalItem): GradedRubric {
  return { prompt: item.claim, points: item.rubric, fallacies: item.fallacies };
}

/** Khoảng trang giáo trình mà barem dựa vào, để gợi ý học viên đọc lại trước khi viết. */
export function pageSpan(points: RubricPoint[]): [number, number] | null {
  const pages = points.map((p) => p.page).filter((p): p is number => !!p);
  return pages.length ? [Math.min(...pages), Math.max(...pages)] : null;
}
