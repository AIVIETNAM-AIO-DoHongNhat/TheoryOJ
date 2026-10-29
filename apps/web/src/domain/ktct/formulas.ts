/**
 * Công thức KTCT chương 3 (giá trị thặng dư) tính bằng code, để mô hình ngôn ngữ không tự làm phép tính.
 *
 * `solve` nhận các đại lượng đã biết, lặp áp dụng các quy tắc cho tới khi không suy thêm được đại lượng nào,
 * rồi báo đại lượng cần tìm nào còn thiếu dữ kiện. Tỷ suất (m', p') tính theo phần trăm.
 */

export const QUANTITIES = {
  c: "tư bản bất biến",
  v: "tư bản khả biến",
  m: "giá trị thặng dư",
  K: "tư bản ứng trước, K = c + v",
  W: "giá trị hàng hóa",
  m_rate: "tỷ suất giá trị thặng dư m' (%)",
  p_rate: "tỷ suất lợi nhuận p' (%)",
  cv_ratio: "cấu tạo hữu cơ c/v",
  V_total: "tổng tư bản khả biến V",
  M: "khối lượng giá trị thặng dư M",
  ngay_lao_dong: "độ dài ngày lao động (giờ)",
  tg_tat_yeu: "thời gian lao động tất yếu (giờ)",
  tg_thang_du: "thời gian lao động thặng dư (giờ)",
} as const;

export type Quantity = keyof typeof QUANTITIES;
export type Values = Partial<Record<Quantity, number>>;

export interface Step {
  output: Quantity;
  formula: string;
  substitution: string;
  value: number;
}

export interface Solution {
  values: Values;
  steps: Step[];
  missing: Quantity[];
}

interface Rule {
  output: Quantity;
  inputs: Quantity[];
  formula: string;
  /** Trả về null khi phép tính không xác định (chia cho 0). */
  compute: (x: Record<Quantity, number>) => number | null;
}

const div = (a: number, b: number) => (b === 0 ? null : a / b);

const RULES: Rule[] = [
  { output: "K", inputs: ["c", "v"], formula: "K = c + v", compute: (x) => x.c + x.v },
  { output: "c", inputs: ["K", "v"], formula: "c = K − v", compute: (x) => x.K - x.v },
  { output: "v", inputs: ["K", "c"], formula: "v = K − c", compute: (x) => x.K - x.c },

  { output: "v", inputs: ["K", "cv_ratio"], formula: "v = K / (1 + c/v)", compute: (x) => div(x.K, 1 + x.cv_ratio) },
  { output: "c", inputs: ["cv_ratio", "v"], formula: "c = (c/v) × v", compute: (x) => x.cv_ratio * x.v },
  { output: "v", inputs: ["c", "cv_ratio"], formula: "v = c / (c/v)", compute: (x) => div(x.c, x.cv_ratio) },
  { output: "cv_ratio", inputs: ["c", "v"], formula: "c/v = c ÷ v", compute: (x) => div(x.c, x.v) },

  { output: "m", inputs: ["m_rate", "v"], formula: "m = m' × v", compute: (x) => (x.m_rate / 100) * x.v },
  { output: "v", inputs: ["m", "m_rate"], formula: "v = m / m'", compute: (x) => div(x.m, x.m_rate / 100) },
  { output: "m_rate", inputs: ["m", "v"], formula: "m' = m / v × 100 %", compute: (x) => div(x.m * 100, x.v) },

  { output: "W", inputs: ["c", "v", "m"], formula: "W = c + v + m", compute: (x) => x.c + x.v + x.m },
  { output: "m", inputs: ["W", "c", "v"], formula: "m = W − (c + v)", compute: (x) => x.W - x.c - x.v },
  { output: "W", inputs: ["K", "m"], formula: "W = K + m", compute: (x) => x.K + x.m },
  { output: "m", inputs: ["W", "K"], formula: "m = W − K", compute: (x) => x.W - x.K },

  { output: "p_rate", inputs: ["m", "K"], formula: "p' = m / (c + v) × 100 %", compute: (x) => div(x.m * 100, x.K) },
  { output: "m", inputs: ["p_rate", "K"], formula: "m = p' × (c + v)", compute: (x) => (x.p_rate / 100) * x.K },
  { output: "K", inputs: ["m", "p_rate"], formula: "c + v = m / p'", compute: (x) => div(x.m, x.p_rate / 100) },

  { output: "M", inputs: ["m_rate", "V_total"], formula: "M = m' × V", compute: (x) => (x.m_rate / 100) * x.V_total },
  { output: "V_total", inputs: ["M", "m_rate"], formula: "V = M / m'", compute: (x) => div(x.M, x.m_rate / 100) },
  { output: "m_rate", inputs: ["M", "V_total"], formula: "m' = M / V × 100 %", compute: (x) => div(x.M * 100, x.V_total) },

  { output: "tg_thang_du", inputs: ["ngay_lao_dong", "tg_tat_yeu"], formula: "t' = ngày lao động − t", compute: (x) => x.ngay_lao_dong - x.tg_tat_yeu },
  { output: "tg_tat_yeu", inputs: ["ngay_lao_dong", "tg_thang_du"], formula: "t = ngày lao động − t'", compute: (x) => x.ngay_lao_dong - x.tg_thang_du },
  { output: "ngay_lao_dong", inputs: ["tg_tat_yeu", "tg_thang_du"], formula: "ngày lao động = t + t'", compute: (x) => x.tg_tat_yeu + x.tg_thang_du },
  { output: "m_rate", inputs: ["tg_thang_du", "tg_tat_yeu"], formula: "m' = t' / t × 100 %", compute: (x) => div(x.tg_thang_du * 100, x.tg_tat_yeu) },
];

export const SYMBOL: Record<Quantity, string> = {
  c: "c", v: "v", m: "m", K: "K", W: "W", m_rate: "m'", p_rate: "p'", cv_ratio: "c/v",
  V_total: "V", M: "M", ngay_lao_dong: "ngày lao động", tg_tat_yeu: "t", tg_thang_du: "t'",
};

export const PERCENT: ReadonlySet<Quantity> = new Set<Quantity>(["m_rate", "p_rate"]);

export function round(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}

function show(q: Quantity, x: number): string {
  return `${SYMBOL[q]} = ${round(x)}${PERCENT.has(q) ? " %" : ""}`;
}

export function solve(known: Values, targets: Quantity[] = []): Solution {
  const values: Values = {};
  for (const [k, x] of Object.entries(known)) {
    if (typeof x === "number" && Number.isFinite(x)) values[k as Quantity] = x;
  }
  const steps: Step[] = [];

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of RULES) {
      if (values[rule.output] !== undefined) continue;
      if (!rule.inputs.every((q) => values[q] !== undefined)) continue;
      const value = rule.compute(values as Record<Quantity, number>);
      if (value === null || !Number.isFinite(value)) continue;
      values[rule.output] = value;
      steps.push({
        output: rule.output,
        formula: rule.formula,
        substitution: rule.inputs.map((q) => show(q, values[q]!)).join("; "),
        value: round(value),
      });
      changed = true;
    }
  }

  for (const q of Object.keys(values) as Quantity[]) values[q] = round(values[q]!);
  return { values, steps, missing: targets.filter((q) => values[q] === undefined) };
}
