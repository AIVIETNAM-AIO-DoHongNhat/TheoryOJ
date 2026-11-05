import "server-only";

import type { Subject } from "@/config/subjects";
import { getPosts } from "@/features/blog/server/posts";
import type { Post } from "@/features/blog/types";
import { getDeck } from "@/features/flashcards/server/deck";
import { docsForChapter } from "@/features/library/server/catalog";
import { type DocChapter, type LibraryDoc, printedPage } from "@/features/library/types";

import type { Suggestion } from "../types";
import { getProfile } from "./profile";

export interface Concept {
  name: string;
  /** Trang PDF trong giáo trình để mở đúng chỗ, nếu thẻ có ghi trang in. */
  pdfPage?: number;
  formula: boolean;
}

export interface ChapterStudy {
  textbook?: LibraryDoc;
  range?: DocChapter;
  /** Trang in đầu, cuối và số trang của chương trong giáo trình. */
  pages?: { from: number; to: number; count: number };
  /** Khái niệm và công thức chính, lấy từ bộ thẻ ghi nhớ của chương theo thứ tự trong giáo trình. */
  concepts: Concept[];
  questions: Suggestion[];
  /** Văn kiện, tài liệu tham khảo gắn với chương (không tính giáo trình). */
  docs: LibraryDoc[];
  posts: Post[];
}

/** Mọi thứ để học một chương ở Bài học: dùng cho roadmap của môn và trang chương. */
export function chapterStudy(subject: Subject, chapter: number): ChapterStudy {
  const all = docsForChapter(subject.id, chapter);
  const textbook = all.find((d) => d.kind === "giao_trinh");
  const range = textbook?.chapters.find((c) => c.number === chapter);
  const pages =
    textbook && range
      ? { from: printedPage(textbook, range.from), to: printedPage(textbook, range.to), count: range.to - range.from + 1 }
      : undefined;
  const concepts = (getDeck(subject.id, chapter)?.cards ?? [])
    .map((c) => ({
      name: c.front,
      pdfPage: textbook && c.page ? c.page - textbook.pageOffset : undefined,
      formula: c.kind === "cong_thuc",
    }))
    // Sắp theo trang trong giáo trình; thẻ không ghi trang xếp cuối, giữ thứ tự trong file.
    .sort((a, b) => (a.pdfPage ?? Infinity) - (b.pdfPage ?? Infinity));

  return {
    textbook,
    range,
    pages,
    concepts,
    questions: getProfile(subject.id).chapterQuestions[chapter] ?? [],
    docs: all.filter((d) => d !== textbook),
    posts: getPosts().filter((p) => p.subject === subject.id && p.chapters.includes(chapter)),
  };
}
