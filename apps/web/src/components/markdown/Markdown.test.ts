import { describe, expect, it } from "vitest";

import { normalize } from "./Markdown";

describe("normalize", () => {
  it("đổi dấu trích dẫn thành liên kết, kể cả khi đứng liền nhau hoặc gộp", () => {
    expect(normalize("Ý một [1][2]. Ý hai [3, 4].")).toBe(
      "Ý một [1](#cite-1)[2](#cite-2). Ý hai [3](#cite-3)[4](#cite-4).",
    );
  });

  it("không đụng tới liên kết Markdown có sẵn", () => {
    expect(normalize("[1](https://example.com)")).toBe("[1](https://example.com)");
  });

  it("đổi \\( \\) và \\[ \\] sang cú pháp $ của remark-math", () => {
    expect(normalize("Ta có \\(m' = m/v\\).")).toBe("Ta có $m' = m/v$.");
    expect(normalize("\\[W = c + v + m\\]")).toBe("\n$$\nW = c + v + m\n$$\n");
  });
});
