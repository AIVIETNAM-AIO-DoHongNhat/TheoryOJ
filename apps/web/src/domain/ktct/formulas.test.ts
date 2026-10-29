import { describe, expect, it } from "vitest";

import { solve } from "./formulas";

// Các ca lấy từ bài tính trong eval/ktct/golden.jsonl.
describe("solve", () => {
  it("ktct-015: m, W, p' từ c, v, m'", () => {
    const { values, missing } = solve({ c: 600, v: 200, m_rate: 200 }, ["m", "W", "p_rate"]);
    expect(values).toMatchObject({ m: 400, W: 1200, p_rate: 50 });
    expect(missing).toEqual([]);
  });

  it("ktct-016: m' trước và sau khi kéo dài ngày lao động", () => {
    expect(solve({ ngay_lao_dong: 8, tg_tat_yeu: 4 }).values.m_rate).toBe(100);
    expect(solve({ ngay_lao_dong: 10, tg_tat_yeu: 4 }).values.m_rate).toBe(150);
  });

  it("ktct-017: tách K theo cấu tạo hữu cơ", () => {
    const { values } = solve({ K: 1_000_000, cv_ratio: 4, m_rate: 100 });
    expect(values).toMatchObject({ c: 800_000, v: 200_000, m: 200_000, W: 1_200_000, p_rate: 20 });
  });

  it("ktct-018: khối lượng giá trị thặng dư", () => {
    expect(solve({ V_total: 40_000, m_rate: 150 }).values.M).toBe(60_000);
  });

  it("ktct-019: thiếu dữ kiện thì báo missing, không tự đặt số", () => {
    const { values, missing } = solve({ m_rate: 200 }, ["p_rate"]);
    expect(values.p_rate).toBeUndefined();
    expect(missing).toEqual(["p_rate"]);
  });

  it("ghi lại công thức và phép thay số của từng bước", () => {
    const { steps } = solve({ c: 600, v: 200, m_rate: 200 });
    expect(steps.find((s) => s.output === "m")).toMatchObject({
      formula: "m = m' × v",
      substitution: "m' = 200 %; v = 200",
      value: 400,
    });
  });

  it("bỏ qua phép chia cho 0 và giá trị không hữu hạn", () => {
    const { values } = solve({ m: 100, v: 0, c: Number.NaN });
    expect(values.m_rate).toBeUndefined();
    expect(values.c).toBeUndefined();
  });
});
