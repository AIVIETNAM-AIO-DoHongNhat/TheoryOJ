import { describe, expect, it } from "vitest";

import { getSubject } from "@/config/subjects";

import { toEmbed } from "../embed";
import { readVideoEntries } from "./videos";

// Bắt lỗi nhập liệu trong content/video/danh-sach.yaml trước khi đăng: video sai không làm hỏng trang mà bị ẩn đi lặng lẽ.
describe("content/video/danh-sach.yaml", () => {
  const entries = readVideoEntries();

  it("slug không trùng, viết không dấu", () => {
    const slugs = entries.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s, String(s)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it.each(entries.map((e) => [e.slug, e] as const))("%s: đủ trường, link nhúng được, môn và chương có thật", (_, e) => {
    expect(e.title, "thiếu title").toBeTruthy();
    expect(Number.isNaN(new Date(e.date).getTime()), "date phải dạng YYYY-MM-DD").toBe(false);
    expect(toEmbed(String(e.url ?? "")), `link chưa hỗ trợ: ${e.url}`).not.toBeNull();
    if (e.orientation) expect(["ngang", "doc"]).toContain(e.orientation);
    if (e.subject) {
      const subject = getSubject(e.subject);
      expect(subject, `không có môn ${e.subject}`).toBeDefined();
      for (const n of e.chapters ?? []) expect(subject!.chapters.map((c) => c.number), `môn ${e.subject} không có chương ${n}`).toContain(n);
    }
  });
});
