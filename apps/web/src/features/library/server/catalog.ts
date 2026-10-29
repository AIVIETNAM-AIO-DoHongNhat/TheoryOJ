import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { SUBJECTS } from "@/config/subjects";

import { DOC_KINDS, type DocFormat, type DocKind, type LibraryDoc, slugOf } from "../types";

/** Học liệu nằm ngoài code, ở content/<môn>/ của repo (PLAN.md mục 6). */
export const CONTENT_ROOT = path.resolve(process.cwd(), "../../content");

interface ManifestDoc {
  file: string;
  title: string;
  kind: DocKind;
  publisher?: string;
  pdf_pages?: number;
  page_offset?: number;
  chapters?: { number: number; pages: [number, number]; title: string }[];
  related_chapters?: number[];
}

const FORMATS: Record<string, DocFormat> = { ".pdf": "pdf", ".md": "md", ".docx": "docx" };

let cached: LibraryDoc[] | null = null;

/**
 * Danh mục tài liệu đọc từ manifest.yaml của các môn đang mở. Đọc đồng bộ để trang vẫn sinh tĩnh được.
 * Chỉ nhận tài liệu đã có file và có định dạng đọc được.
 */
export function getLibrary(): LibraryDoc[] {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const docs: LibraryDoc[] = [];
  for (const subject of SUBJECTS.filter((s) => s.active)) {
    const manifestPath = path.join(CONTENT_ROOT, subject.id, "manifest.yaml");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = parse(fs.readFileSync(manifestPath, "utf8")) as { documents: ManifestDoc[] };
    for (const d of manifest.documents) {
      const format = FORMATS[path.extname(d.file).toLowerCase()];
      const abs = path.join(CONTENT_ROOT, subject.id, d.file);
      if (!format || !DOC_KINDS.includes(d.kind) || !fs.existsSync(abs)) continue;
      docs.push({
        slug: slugOf(d.file),
        subject: subject.id,
        file: d.file,
        title: d.title,
        kind: d.kind,
        format,
        publisher: d.publisher ?? null,
        pages: d.pdf_pages ?? null,
        pageOffset: d.page_offset ?? 0,
        chapters: (d.chapters ?? []).map((c) => ({ number: c.number, title: c.title, from: c.pages[0], to: c.pages[1] })),
        relatedChapters: d.related_chapters ?? [],
        sizeBytes: fs.statSync(abs).size,
      });
    }
  }
  docs.sort((a, b) => DOC_KINDS.indexOf(a.kind) - DOC_KINDS.indexOf(b.kind));
  cached = docs;
  return docs;
}

export function getDoc(slug: string): LibraryDoc | undefined {
  return getLibrary().find((d) => d.slug === slug);
}

export function docPath(doc: LibraryDoc): string {
  return path.join(CONTENT_ROOT, doc.subject, doc.file);
}

/** Tài liệu liên quan tới một chương: giáo trình có chương đó, và văn kiện, tham khảo khai báo related_chapters. */
export function docsForChapter(subject: string, chapter: number): LibraryDoc[] {
  return getLibrary().filter(
    (d) => d.subject === subject && (d.chapters.some((c) => c.number === chapter) || d.relatedChapters.includes(chapter)),
  );
}
