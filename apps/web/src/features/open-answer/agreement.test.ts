import { describe, expect, it } from "vitest";

import { agreement, pearson, ranks, spearman } from "./agreement";

describe("agreement", () => {
  it("hạng trung bình khi bằng nhau", () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });

  it("tương quan hoàn toàn và ngược chiều", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [9, 7, 5, 1])).toBeCloseTo(-1);
  });

  it("không đủ dữ liệu hoặc không biến thiên thì null", () => {
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(pearson([5, 5, 5], [1, 2, 3])).toBeNull();
  });

  it("tính sai lệch, tỷ lệ lệch không quá 1 điểm và độ chệch", () => {
    const a = agreement([
      { ai: 8, lecturer: 7 },
      { ai: 5, lecturer: 6 },
      { ai: 9, lecturer: 6 },
    ]);
    expect(a.n).toBe(3);
    expect(a.mae).toBeCloseTo(5 / 3);
    expect(a.within1).toBeCloseTo(2 / 3);
    expect(a.bias).toBeCloseTo(1);
  });

  it("rỗng", () => {
    expect(agreement([])).toMatchObject({ n: 0, mae: null, spearman: null });
  });
});
