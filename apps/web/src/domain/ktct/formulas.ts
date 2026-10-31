/**
 * Công thức KTCT tính bằng code (chương 2: lưu thông tiền tệ; chương 3: giá trị thặng dư, chu chuyển,
 * lợi nhuận bình quân), để mô hình ngôn ngữ không tự làm phép tính.
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
  tg_mot_vong: "thời gian một vòng chu chuyển ch (tháng)",
  so_vong: "tốc độ chu chuyển n (vòng/năm)",
  tong_m: "tổng giá trị thặng dư các ngành Σm",
  tong_K: "tổng tư bản ứng trước các ngành ΣK",
  pbq_rate: "tỷ suất lợi nhuận bình quân P̄' (%)",
  p_bq: "lợi nhuận bình quân P̄",
  gcsx: "giá cả sản xuất GCSX",
  muc_gia: "mức giá cả P",
  khoi_luong_hang: "khối lượng hàng hóa đưa ra lưu thông Q",
  tong_gia_ca: "tổng giá cả hàng hóa P.Q",
  ban_chiu: "tổng giá cả hàng hóa bán chịu G1",
  khau_tru: "tổng giá cả hàng hóa khấu trừ cho nhau G2",
  den_han: "tổng giá cả hàng hóa đến kỳ thanh toán G3",
  so_vong_tien: "số vòng lưu thông của đồng tiền V",
  tien_can_thiet: "lượng tiền cần thiết cho lưu thông M",
} as const;

export type Quantity = keyof typeof QUANTITIES;
export type Values = Partial<Record<Quantity, number>>;

export interface Step {
  output: Quantity;
  inputs: Quantity[];
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

  // Chu chuyển: CH = 12 tháng. Tư bản khả biến quay n vòng thì cả năm sử dụng V = v × n.
  { output: "so_vong", inputs: ["tg_mot_vong"], formula: "n = CH / ch = 12 tháng / ch", compute: (x) => div(12, x.tg_mot_vong) },
  { output: "tg_mot_vong", inputs: ["so_vong"], formula: "ch = 12 tháng / n", compute: (x) => div(12, x.so_vong) },
  { output: "V_total", inputs: ["v", "so_vong"], formula: "V = v × n", compute: (x) => x.v * x.so_vong },

  // Lợi nhuận bình quân và giá cả sản xuất; chi phí sản xuất k = c + v (giả định tư bản chuyển hết vào sản phẩm).
  { output: "pbq_rate", inputs: ["tong_m", "tong_K"], formula: "P̄' = Σm / Σ(c + v) × 100 %", compute: (x) => div(x.tong_m * 100, x.tong_K) },
  { output: "p_bq", inputs: ["pbq_rate", "K"], formula: "P̄ = P̄' × K", compute: (x) => (x.pbq_rate / 100) * x.K },
  { output: "gcsx", inputs: ["K", "p_bq"], formula: "GCSX = k + P̄, với k = c + v", compute: (x) => x.K + x.p_bq },

  // Lưu thông tiền tệ. Công thức có bán chịu đứng trước để được dùng khi đề cho đủ G1, G2, G3.
  { output: "tong_gia_ca", inputs: ["muc_gia", "khoi_luong_hang"], formula: "P.Q = P × Q", compute: (x) => x.muc_gia * x.khoi_luong_hang },
  {
    output: "tien_can_thiet", inputs: ["tong_gia_ca", "ban_chiu", "khau_tru", "den_han", "so_vong_tien"],
    formula: "M = (P.Q − (G1 + G2) + G3) / V",
    compute: (x) => div(x.tong_gia_ca - (x.ban_chiu + x.khau_tru) + x.den_han, x.so_vong_tien),
  },
  {
    output: "so_vong_tien", inputs: ["tong_gia_ca", "ban_chiu", "khau_tru", "den_han", "tien_can_thiet"],
    formula: "V = (P.Q − (G1 + G2) + G3) / M",
    compute: (x) => div(x.tong_gia_ca - (x.ban_chiu + x.khau_tru) + x.den_han, x.tien_can_thiet),
  },
  { output: "tien_can_thiet", inputs: ["tong_gia_ca", "so_vong_tien"], formula: "M = P.Q / V", compute: (x) => div(x.tong_gia_ca, x.so_vong_tien) },
  { output: "so_vong_tien", inputs: ["tong_gia_ca", "tien_can_thiet"], formula: "V = P.Q / M", compute: (x) => div(x.tong_gia_ca, x.tien_can_thiet) },
  { output: "tong_gia_ca", inputs: ["tien_can_thiet", "so_vong_tien"], formula: "P.Q = M × V", compute: (x) => x.tien_can_thiet * x.so_vong_tien },
];

export const SYMBOL: Record<Quantity, string> = {
  c: "c", v: "v", m: "m", K: "K", W: "W", m_rate: "m'", p_rate: "p'", cv_ratio: "c/v",
  V_total: "V", M: "M", ngay_lao_dong: "ngày lao động", tg_tat_yeu: "t", tg_thang_du: "t'",
  tg_mot_vong: "ch", so_vong: "n", tong_m: "Σm", tong_K: "ΣK", pbq_rate: "P̄'", p_bq: "P̄", gcsx: "GCSX",
  muc_gia: "P", khoi_luong_hang: "Q", tong_gia_ca: "P.Q", ban_chiu: "G1", khau_tru: "G2", den_han: "G3",
  so_vong_tien: "V", tien_can_thiet: "M",
};

export const PERCENT: ReadonlySet<Quantity> = new Set<Quantity>(["m_rate", "p_rate", "pbq_rate"]);

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
        inputs: rule.inputs,
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
