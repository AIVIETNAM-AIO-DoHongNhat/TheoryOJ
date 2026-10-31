/**
 * Bài tập tính toán sinh số ngẫu nhiên (KTCT chương 2 và 3). Đáp án và lời giải tính bằng `solve` (formulas.ts),
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
  tg_mot_vong: "tháng", so_vong: "vòng/năm", tong_m: "triệu đồng", tong_K: "triệu đồng", pbq_rate: "%",
  p_bq: "triệu đồng", gcsx: "triệu đồng",
  muc_gia: "nghìn đồng", khoi_luong_hang: "triệu đơn vị", tong_gia_ca: "tỷ đồng", ban_chiu: "tỷ đồng",
  khau_tru: "tỷ đồng", den_han: "tỷ đồng", so_vong_tien: "vòng", tien_can_thiet: "tỷ đồng",
};

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const num = (x: number | undefined) => (x ?? 0).toLocaleString("vi-VN");

const V_CHOICES = [20, 25, 40, 50, 60, 80, 100, 120, 150, 200] as const;
const CV_CHOICES = [2, 3, 4, 5, 7, 9] as const;
const RATE_CHOICES = [100, 120, 150, 200, 250, 300] as const;
const PQ_CHOICES = [600, 800, 1_000, 1_200, 1_500, 2_000, 2_400] as const;
const MONEY_TURNS = [2, 4, 5, 6, 8, 10] as const;

/** Chương 2, quy luật lưu thông tiền tệ (giáo trình tr. 40–41). */
const CHAPTER_2: ExerciseTemplate[] = [
  {
    id: "luong-tien-co-ban",
    title: "Lượng tiền cần thiết cho lưu thông",
    given: ["muc_gia", "khoi_luong_hang", "so_vong_tien"],
    targets: ["tong_gia_ca", "tien_can_thiet"],
    generate: () => ({
      muc_gia: pick([20, 25, 40, 50, 60, 80, 100] as const),
      khoi_luong_hang: pick([10, 12, 20, 30, 40, 50] as const),
      so_vong_tien: pick(MONEY_TURNS),
    }),
    prompt: (x) =>
      `Trong một năm, nền kinh tế đưa ra lưu thông ${num(x.khoi_luong_hang)} triệu đơn vị hàng hóa với mức giá bình quân ` +
      `${num(x.muc_gia)} nghìn đồng một đơn vị. Mỗi đồng tiền quay trung bình ${x.so_vong_tien} vòng trong năm. ` +
      `Tính tổng giá cả hàng hóa P.Q (tỷ đồng) và lượng tiền cần thiết cho lưu thông M.`,
  },
  {
    id: "luong-tien-tin-dung",
    title: "Lượng tiền khi có bán chịu, khấu trừ",
    given: ["tong_gia_ca", "ban_chiu", "khau_tru", "den_han", "so_vong_tien"],
    targets: ["tien_can_thiet"],
    generate: () => {
      const pq = pick(PQ_CHOICES);
      return {
        tong_gia_ca: pq,
        ban_chiu: (pq * pick([5, 10, 15, 20] as const)) / 100,
        khau_tru: (pq * pick([5, 10] as const)) / 100,
        den_han: (pq * pick([5, 10, 15] as const)) / 100,
        so_vong_tien: pick(MONEY_TURNS),
      };
    },
    prompt: (x) =>
      `Tổng giá cả hàng hóa đưa ra lưu thông trong năm là ${num(x.tong_gia_ca)} tỷ đồng, trong đó hàng bán chịu ` +
      `${num(x.ban_chiu)} tỷ đồng, hàng khấu trừ cho nhau ${num(x.khau_tru)} tỷ đồng; hàng bán chịu từ trước đến kỳ ` +
      `thanh toán ${num(x.den_han)} tỷ đồng. Số vòng quay trung bình của tiền là ${x.so_vong_tien}. ` +
      `Tính lượng tiền cần thiết cho lưu thông M.`,
  },
  {
    id: "so-vong-tien",
    title: "Số vòng lưu thông của tiền",
    given: ["tong_gia_ca", "tien_can_thiet"],
    targets: ["so_vong_tien"],
    generate: () => {
      const pq = pick(PQ_CHOICES);
      return { tong_gia_ca: pq, tien_can_thiet: pq / pick(MONEY_TURNS) };
    },
    prompt: (x) =>
      `Tổng giá cả hàng hóa đưa ra lưu thông trong năm là ${num(x.tong_gia_ca)} tỷ đồng, lượng tiền cần thiết cho ` +
      `lưu thông là ${num(x.tien_can_thiet)} tỷ đồng. Không có bán chịu và khấu trừ. Tính số vòng lưu thông của đồng tiền V.`,
  },
];

/** Chương 3, học thuyết giá trị thặng dư. */
const CHAPTER_3: ExerciseTemplate[] = [
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
  {
    id: "chu-chuyen",
    title: "Chu chuyển và giá trị thặng dư cả năm",
    given: ["v", "tg_mot_vong", "m_rate"],
    targets: ["so_vong", "V_total", "M"],
    generate: () => ({ v: pick(V_CHOICES), tg_mot_vong: pick([1, 2, 3, 4, 6] as const), m_rate: pick(RATE_CHOICES) }),
    prompt: (x) =>
      `Một doanh nghiệp ứng ra tư bản khả biến v = ${num(x.v)} triệu đồng, thời gian một vòng chu chuyển của bộ phận ` +
      `tư bản này là ${x.tg_mot_vong} tháng, tỷ suất giá trị thặng dư m' = ${num(x.m_rate)} %. Tính tốc độ chu chuyển n ` +
      `trong năm, tổng tư bản khả biến sử dụng trong năm V và khối lượng giá trị thặng dư cả năm M.`,
  },
  {
    id: "loi-nhuan-binh-quan",
    title: "Lợi nhuận bình quân và giá cả sản xuất",
    given: ["tong_m", "tong_K", "c", "v"],
    targets: ["pbq_rate", "p_bq", "gcsx"],
    generate: () => {
      const total = pick([1_000, 2_000, 2_500, 4_000, 5_000] as const);
      const v = pick([20, 25, 40, 50] as const);
      return { tong_K: total, tong_m: (total * pick([10, 15, 20, 25, 30] as const)) / 100, c: v * pick(CV_CHOICES), v };
    },
    prompt: (x) =>
      `Các ngành sản xuất trong nền kinh tế có tổng tư bản ứng trước Σ(c + v) = ${num(x.tong_K)} triệu đồng và tổng giá trị ` +
      `thặng dư Σm = ${num(x.tong_m)} triệu đồng. Một doanh nghiệp ứng trước ${num(x.c)}c + ${num(x.v)}v (triệu đồng), ` +
      `tư bản chuyển hết giá trị vào sản phẩm trong kỳ. Tính tỷ suất lợi nhuận bình quân P̄', lợi nhuận bình quân P̄ ` +
      `của doanh nghiệp và giá cả sản xuất GCSX.`,
  },
];

/** Bài tập sinh số theo môn và chương. Chương không có ở đây thì không có trang bài tập. */
export const EXERCISES: Record<string, Record<number, ExerciseTemplate[]>> = {
  ktct: { 2: CHAPTER_2, 3: CHAPTER_3 },
};

export const TEMPLATES: ExerciseTemplate[] = Object.values(EXERCISES).flatMap((chapters) => Object.values(chapters).flat());

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
