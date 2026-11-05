import { describe, expect, it } from "vitest";

import { ACTIVE_SUBJECTS } from "@/config/subjects";

import { getDeck } from "./server/deck";

// Kiểm tra mọi bộ thẻ theo quy ước trong content/<môn>/the-ghi-nho/_mau.yaml.
const decks = ACTIVE_SUBJECTS.flatMap((s) =>
  s.chapters.map((c) => ({ subject: s, chapter: c.number, deck: getDeck(s.id, c.number) })).filter((d) => d.deck),
);

describe.each(decks.map((d) => [`${d.subject.id}/chuong-${d.chapter}`, d] as const))("%s", (_, { subject, chapter, deck }) => {
  it("đúng môn và chương, có ít nhất 4 thẻ", () => {
    expect(deck!.subject).toBe(subject.id);
    expect(deck!.chapter).toBe(chapter);
    expect(deck!.cards.length).toBeGreaterThanOrEqual(4);
  });

  it("mã thẻ theo dạng t<chương>-<số>, mặt trước ngắn", () => {
    for (const c of deck!.cards) {
      expect(c.id, c.id).toMatch(new RegExp(`^t${chapter}-[0-9]{2}$`));
      expect(c.front.length, c.id).toBeLessThanOrEqual(120);
    }
  });

  it("công thức viết bằng $...$ cân dấu", () => {
    for (const c of deck!.cards) expect((c.back.match(/\$/g) ?? []).length % 2, c.id).toBe(0);
  });
});

it("KTCT có bộ thẻ cho cả 6 chương", () => {
  expect(decks.filter((d) => d.subject.id === "ktct")).toHaveLength(6);
});
