// Độ đồng thuận giữa điểm hệ thống chấm và điểm giảng viên chấm (PLAN.md mục 9): bằng chứng chất lượng cho hồ sơ sáng kiến.
// Hàm thuần, dùng ở trang quản trị và scripts/eval-cham.mts.

export interface Pair {
  /** Điểm hệ thống, quy về thang 10. */
  ai: number;
  /** Điểm giảng viên, quy về thang 10. */
  lecturer: number;
}

export interface Agreement {
  n: number;
  /** Sai lệch tuyệt đối trung bình, thang 10. */
  mae: number | null;
  pearson: number | null;
  spearman: number | null;
  /** Tỷ lệ bài lệch không quá 1 điểm. */
  within1: number | null;
  /** Hệ thống chấm cao hơn giảng viên trung bình bao nhiêu điểm (âm: thấp hơn). */
  bias: number | null;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}

/** Hạng trung bình cho các giá trị bằng nhau. */
export function ranks(xs: number[]): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].x === order[i].x) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[order[k].i] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(xs: number[], ys: number[]): number | null {
  return pearson(ranks(xs), ranks(ys));
}

export function agreement(pairs: Pair[]): Agreement {
  const n = pairs.length;
  if (n === 0) return { n, mae: null, pearson: null, spearman: null, within1: null, bias: null };
  const ai = pairs.map((p) => p.ai);
  const gv = pairs.map((p) => p.lecturer);
  return {
    n,
    mae: mean(pairs.map((p) => Math.abs(p.ai - p.lecturer))),
    pearson: pearson(ai, gv),
    spearman: spearman(ai, gv),
    within1: pairs.filter((p) => Math.abs(p.ai - p.lecturer) <= 1).length / n,
    bias: mean(pairs.map((p) => p.ai - p.lecturer)),
  };
}

/** Quy điểm về thang 10. */
export const to10 = (score: number, max: number) => (max > 0 ? (score / max) * 10 : 0);
