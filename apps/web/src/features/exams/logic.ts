// Quy tắc của đề thi dùng chung cho máy chủ, trang quản trị và trang học viên. Không chạm DB, để kiểm thử được.

export const REVEALS = ["ngay", "sau-han", "chi-diem"] as const;
export type Reveal = (typeof REVEALS)[number];

export const REVEAL_LABELS: Record<Reveal, { label: string; hint: string }> = {
  ngay: { label: "Xem đáp án ngay", hint: "Nộp xong thấy điểm, đáp án và giải thích" },
  "sau-han": { label: "Đáp án sau hạn", hint: "Nộp xong thấy điểm; đáp án hiện khi đề đóng" },
  "chi-diem": { label: "Chỉ xem điểm", hint: "Không hiện đáp án, dùng cho đề kiểm tra lấy điểm" },
};

/** Câu hỏi chép vào đề lúc lưu. `key` = "<chương>:<mã câu>", không trùng trong đề dù hai chương có câu cùng mã. */
export interface ExamQuestion {
  key: string;
  chapter: number;
  code: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
  page: number | null;
}

/** Thứ tự câu và phương án của một lượt làm. `options` là vị trí phương án trong đề gốc theo thứ tự hiển thị. */
export interface LayoutItem {
  key: string;
  options: number[];
}

/** Nộp trễ trong khoảng này (mạng chậm, bấm nộp đúng giây cuối) vẫn nhận đáp án gửi kèm. */
export const GRACE_MS = 30_000;

/** Đạt từ 5/10, theo thang điểm thông thường của bài kiểm tra. */
export const EXAM_PASS_RATIO = 0.5;

export const examKey = (chapter: number, code: string) => `${chapter}:${code}`;

export type ExamPhase = "nhap" | "sap-mo" | "dang-mo" | "da-dong";

export const PHASE_LABELS: Record<ExamPhase, string> = {
  nhap: "Bản nháp",
  "sap-mo": "Sắp mở",
  "dang-mo": "Đang mở",
  "da-dong": "Đã đóng",
};

interface Schedule {
  status: "nhap" | "da-giao";
  opensAt: Date | null;
  closesAt: Date | null;
}

export function examPhase(exam: Schedule, now: Date): ExamPhase {
  if (exam.status === "nhap") return "nhap";
  if (exam.opensAt && now < exam.opensAt) return "sap-mo";
  if (exam.closesAt && now >= exam.closesAt) return "da-dong";
  return "dang-mo";
}

/** Hạn nộp thật của một lượt: hết thời gian làm bài hoặc tới giờ đóng đề, tùy cái nào trước. */
export function effectiveDeadline(attemptDeadline: Date, closesAt: Date | null): Date {
  return closesAt && closesAt < attemptDeadline ? closesAt : attemptDeadline;
}

/** Học viên xem được đáp án, giải thích của bài đã nộp chưa. */
export function answersVisible(exam: { reveal: Reveal; closesAt: Date | null }, now: Date): boolean {
  if (exam.reveal === "ngay") return true;
  if (exam.reveal === "chi-diem") return false;
  return !exam.closesAt || now >= exam.closesAt;
}

/** Lớp của học viên có trong danh sách lớp được giao không. Danh sách rỗng là giao cho mọi học viên. */
export function classMatches(classes: string[], className: string): boolean {
  if (classes.length === 0) return true;
  const own = className.trim().toLocaleUpperCase("vi");
  return classes.some((c) => c.trim().toLocaleUpperCase("vi") === own);
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Thứ tự câu, phương án cho một lượt mới; mỗi học viên một thứ tự riêng nếu đề bật trộn. */
export function buildLayout(questions: ExamQuestion[], shuffle: boolean, random: () => number = Math.random): LayoutItem[] {
  const order = shuffle ? shuffled(questions, random) : questions;
  return order.map((q) => {
    const keys = q.options.map((_, i) => i);
    return { key: q.key, options: shuffle ? shuffled(keys, random) : keys };
  });
}

export interface GradedItem {
  key: string;
  chosen: number | null;
  answer: number;
  correct: boolean;
}

/** Chấm theo đáp án đã lưu. Câu bỏ trống hoặc chọn phương án không có trong câu tính là sai. */
export function grade(questions: ExamQuestion[], answers: Record<string, number>): { score: number; total: number; items: GradedItem[] } {
  const items = questions.map((q) => {
    const raw = answers[q.key];
    const chosen = typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    return { key: q.key, chosen, answer: q.answer, correct: chosen === q.answer };
  });
  return { score: items.filter((i) => i.correct).length, total: questions.length, items };
}

/** Điểm thang 10, làm tròn hai chữ số, viết kiểu Việt Nam ("8,25"). */
export function score10(score: number | null, total: number): string {
  if (score === null || total === 0) return "—";
  return (Math.round((score / total) * 1000) / 100).toLocaleString("vi-VN");
}

/** "45 phút", "1 giờ 30 phút". */
export function durationText(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h && `${h} giờ`, (m || !h) && `${m} phút`].filter(Boolean).join(" ");
}
