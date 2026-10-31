/**
 * Bài tập tính toán chương 3 sinh số ngẫu nhiên. Đáp án và lời giải tính bằng `solve` (formulas.ts),
 * cùng bộ công thức với công cụ tính của trợ lý, nên đề và chấm luôn khớp nhau.
 */
import { QUANTITIES, type Quantity, round, solve, type Step, SYMBOL, type Values } from "./formulas";

export interface ExerciseTemplate {
  id: string;
  title: string;
  given: Quantity[];
  targets: Quantity[];
  generate: () => Values;
  prompt: (v: Values) => string;
}

export const UNITS: Partial<Record<Quantity, string>> = {
  c: "triệu đồng", v: "triệu đồng", m: "triệu đồng", K: "triệu đồng", W: "triệu đồng",
  V_total: "triệu đồng", M: "triệu đồng", m_rate: "%", p_rate: "%",
  ngay_lao_dong: "giờ", tg_tat_yeu: "giờ", tg_thang_du: "giờ",
};

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const num = (x: number | undefined) => (x ?? 0).toLocaleString("vi-VN");

const V_CHOICES = [20, 25, 40, 50, 60, 80, 100, 120, 150, 200] as const;
const CV_CHOICES = [2, 3, 4, 5, 7, 9] as const;
const RATE_CHOICES = [100, 120, 150, 200, 250, 300] as const;

export const TEMPLATES: ExerciseTemplate[] = [
  {
    id: "tu-ban-ung-truoc",
    title: "Tư bản ứng trước và cấu tạo hữu cơ",
    given: ["K", "cv_ratio", "m_rate"],
    targets: ["m", "p_rate"],
    generate: () => {
      const v = pick(V_CHOICES);
      const cv = pick(CV_CHOICES);
      return { K: v * (1 + cv), cv_ratio: cv, m_rate: pick(RATE_CHOICES) };
    },
    prompt: (x) =>
      `Một doanh nghiệp ứng trước ${num(x.K)} triệu đồng, cấu tạo hữu cơ c/v = ${x.cv_ratio}/1, ` +
      `tỷ suất giá trị thặng dư m' = ${num(x.m_rate)} %. Tính giá trị thặng dư m và tỷ suất lợi nhuận p'.`,
  },
  {
    id: "gia-tri-hang-hoa",
    title: "Giá trị hàng hóa",
    given: ["c", "v", "m_rate"],
    targets: ["m", "W", "p_rate"],
    generate: () => {
      const v = pick(V_CHOICES);
      return { c: v * pick(CV_CHOICES), v, m_rate: pick(RATE_CHOICES) };
    },
    prompt: (x) =>
      `Để sản xuất một lô hàng, nhà tư bản chi ${num(x.c)} triệu đồng cho tư liệu sản xuất (c) và ${num(x.v)} triệu đồng ` +
      `thuê công nhân (v). Tỷ suất giá trị thặng dư m' = ${num(x.m_rate)} %. Tính giá trị thặng dư m, giá trị lô hàng W ` +
      `và tỷ suất lợi nhuận p'.`,
  },
  {
    id: "ngay-lao-dong",
    title: "Ngày lao động và tỷ suất giá trị thặng dư",
    given: ["ngay_lao_dong", "tg_tat_yeu"],
    targets: ["tg_thang_du", "m_rate"],
    generate: () => {
      const day = pick([8, 9, 10, 12] as const);
      return { ngay_lao_dong: day, tg_tat_yeu: pick([2, 3, 4, 5, 6].filter((t) => t < day)) };
    },
    prompt: (x) =>
      `Ngày lao động dài ${x.ngay_lao_dong} giờ, trong đó thời gian lao động tất yếu là ${x.tg_tat_yeu} giờ. ` +
      `Tính thời gian lao động thặng dư t' và tỷ suất giá trị thặng dư m'.`,
  },
  {
    id: "khoi-luong-gttd",
    title: "Khối lượng giá trị thặng dư",
    given: ["V_total", "m_rate"],
    targets: ["M"],
    generate: () => ({ V_total: pick(V_CHOICES) * pick([5, 10, 20] as const), m_rate: pick(RATE_CHOICES) }),
    prompt: (x) =>
      `Tổng tư bản khả biến của một doanh nghiệp là V = ${num(x.V_total)} triệu đồng, tỷ suất giá trị thặng dư ` +
      `m' = ${num(x.m_rate)} %. Tính khối lượng giá trị thặng dư M.`,
  },
  {
    id: "tim-ty-suat",
    title: "Tìm tỷ suất từ giá trị hàng hóa",
    given: ["W", "c", "v"],
    targets: ["m", "m_rate", "p_rate"],
    generate: () => {
      const v = pick(V_CHOICES);
      const c = v * pick(CV_CHOICES);
      return { W: c + v + (v * pick(RATE_CHOICES)) / 100, c, v };
    },
    prompt: (x) =>
      `Một lô hàng có giá trị W = ${num(x.W)} triệu đồng, trong đó tư bản bất biến c = ${num(x.c)} triệu đồng, ` +
      `tư bản khả biến v = ${num(x.v)} triệu đồng. Tính giá trị thặng dư m, tỷ suất giá trị thặng dư m' và ` +
      `tỷ suất lợi nhuận p'.`,
  },
];

/** Bài tập sinh số theo môn và chương. Chương không có ở đây thì không có trang bài tập. */
export const EXERCISES: Record<string, Record<number, ExerciseTemplate[]>> = {
  ktct: { 3: TEMPLATES },
};

export function getTemplate(id: string): ExerciseTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export interface Exercise {
  template: string;
  given: Values;
  prompt: string;
}

export function makeExercise(template: ExerciseTemplate): Exercise {
  const given = template.generate();
  return { template: template.id, given, prompt: template.prompt(given) };
}

/** Đề đầu tiên của trang: dạng bài chọn ngẫu nhiên. */
export function randomExercise(templates: ExerciseTemplate[]): Exercise {
  return makeExercise(pick(templates));
}

/** Sai số chấp nhận: 0,5 % giá trị hoặc 0,01, tùy cái nào lớn hơn (học viên làm tròn khác nhau). */
export function isClose(answer: number, expected: number): boolean {
  return Math.abs(answer - expected) <= Math.max(0.01, Math.abs(expected) * 0.005);
}

/** Đọc số học viên nhập: chấp nhận dấu phẩy thập phân, dấu chấm hoặc khoảng trắng ngăn cách hàng nghìn, ký hiệu %. */
export function parseAnswer(raw: string): number | null {
  let s = raw.trim().replace(/\s|%/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

/** Chỉ giữ các bước dẫn tới đại lượng cần tìm; `solve` suy ra mọi thứ suy được, kể cả đại lượng đề không hỏi. */
export function relevantSteps(steps: Step[], targets: Quantity[]): Step[] {
  const needed = new Set(targets);
  const kept: Step[] = [];
  for (const step of [...steps].reverse()) {
    if (!needed.has(step.output)) continue;
    kept.unshift(step);
    step.inputs.forEach((q) => needed.add(q));
  }
  return kept;
}

/** Tên đại lượng để làm nhãn ô nhập: bỏ ký hiệu và đơn vị đã ghi riêng, ví dụ "tỷ suất lợi nhuận". */
export function quantityLabel(q: Quantity): string {
  return QUANTITIES[q].replace(/ \(.*\)$/, "").split(",")[0].replace(new RegExp(` ${SYMBOL[q]}$`), "");
}

export function gradeExercise(template: ExerciseTemplate, given: Values, answers: Partial<Record<Quantity, number | null>>) {
  const solution = solve(given, template.targets);
  const results = template.targets.map((q) => {
    const expected = solution.values[q]!;
    const answer = answers[q] ?? null;
    return { quantity: q, expected: round(expected), answer, correct: answer !== null && isClose(answer, expected) };
  });
  return { results, steps: relevantSteps(solution.steps, template.targets) };
}
