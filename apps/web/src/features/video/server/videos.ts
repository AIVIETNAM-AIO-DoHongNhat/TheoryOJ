import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { DEFAULT_SUBJECT } from "@/config/subjects";
import { CONTENT_ROOT } from "@/features/library/server/catalog";

import { toEmbed } from "../embed";
import type { Video } from "../types";

/** Danh sách video nằm trong một file content/video/danh-sach.yaml, hướng dẫn điền ở đầu file. */
export const VIDEO_FILE = path.join(CONTENT_ROOT, "video", "danh-sach.yaml");

export interface VideoEntry {
  slug: string;
  title: string;
  description?: string;
  url: string;
  date: string | Date;
  author?: string;
  category?: string;
  subject?: string;
  chapters?: number[];
  duration?: string;
  orientation?: "ngang" | "doc";
  cover?: string;
  draft?: boolean;
}

export function readVideoEntries(file = VIDEO_FILE): VideoEntry[] {
  if (!fs.existsSync(file)) return [];
  const doc = parse(fs.readFileSync(file, "utf8")) as { videos?: VideoEntry[] | null } | null;
  return doc?.videos ?? [];
}

function toVideo(e: VideoEntry): Video | null {
  const orientation = e.orientation === "doc" ? "doc" : "ngang";
  const embed = toEmbed(String(e.url ?? ""), { vertical: orientation === "doc" });
  // Link sai bị bỏ qua thay vì làm hỏng trang; videos.test.ts báo lỗi trước khi đăng.
  if (!embed || !e.slug || !e.title) return null;
  return {
    slug: e.slug,
    title: e.title,
    description: e.description ?? "",
    date: (e.date instanceof Date ? e.date : new Date(e.date)).toISOString().slice(0, 10),
    author: e.author ?? null,
    category: e.category ?? "Bài giảng",
    subject: e.subject ?? DEFAULT_SUBJECT,
    chapters: e.chapters ?? [],
    duration: e.duration ? String(e.duration) : null,
    orientation,
    cover: e.cover ?? null,
    embed,
  };
}

/** Video đã đăng, mới nhất trước. Mục có `draft: true` không hiện. */
export function getVideos(): Video[] {
  return readVideoEntries()
    .filter((e) => !e.draft)
    .map(toVideo)
    .filter((v): v is Video => v !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getVideo(slug: string): Video | undefined {
  return getVideos().find((v) => v.slug === slug);
}
