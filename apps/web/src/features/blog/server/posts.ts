import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { CONTENT_ROOT } from "@/features/library/server/catalog";

import type { Post } from "../types";

/** Mỗi bài là một file .md trong content/bai-viet/, phần đầu file là YAML giữa hai dòng "---". */
const POSTS_DIR = path.join(CONTENT_ROOT, "bai-viet");

interface Frontmatter {
  title: string;
  description: string;
  date: string | Date;
  author: string;
  category: string;
  subject?: string;
  chapters?: number[];
  cover?: string;
  draft?: boolean;
}

function readPost(file: string): Post | null {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const fm = parse(match[1]) as Frontmatter;
  if (fm.draft) return null;
  const body = match[2].trim();
  const words = body.split(/\s+/).length;
  return {
    slug: file.replace(/\.md$/, ""),
    title: fm.title,
    description: fm.description,
    date: (fm.date instanceof Date ? fm.date : new Date(fm.date)).toISOString().slice(0, 10),
    author: fm.author,
    category: fm.category,
    subject: fm.subject ?? "ktct",
    chapters: fm.chapters ?? [],
    cover: fm.cover ?? null,
    readingMinutes: Math.max(1, Math.round(words / 220)),
    body,
  };
}

/** Bài đã đăng, mới nhất trước. Bài có `draft: true` không hiện. */
export function getPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map(readPost)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}
