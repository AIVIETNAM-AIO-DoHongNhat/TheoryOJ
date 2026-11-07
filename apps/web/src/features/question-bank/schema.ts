import { z } from "zod";

// Quy ước soạn câu hỏi dùng chung cho trình soạn ở /quan-tri/cau-hoi, Server Action và bộ đọc văn bản dán vào.
// Giống quy ước file content/<môn>/question-bank/_mau.yaml: 2–6 phương án, đúng một đáp án, trang in của giáo trình.

export const LETTERS = "ABCDEF";
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = LETTERS.length;

export const QuestionInput = z
  .object({
    q: z.string().trim().min(5, "Câu hỏi quá ngắn.").max(2000, "Câu hỏi quá dài (tối đa 2000 ký tự)."),
    options: z
      .array(z.string().trim().min(1, "Phương án không được để trống.").max(600, "Phương án quá dài (tối đa 600 ký tự)."))
      .min(MIN_OPTIONS, `Cần ít nhất ${MIN_OPTIONS} phương án.`)
      .max(MAX_OPTIONS, `Tối đa ${MAX_OPTIONS} phương án.`),
    answer: z.number().int().min(0),
    explain: z.string().trim().max(2000, "Giải thích quá dài (tối đa 2000 ký tự).").default(""),
    page: z.number().int().positive("Trang phải là số dương.").max(5000).nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.answer >= v.options.length) ctx.addIssue({ code: "custom", path: ["answer"], message: "Chưa chọn đáp án đúng." });
    const seen = new Set<string>();
    v.options.forEach((o, i) => {
      const key = o.toLocaleLowerCase("vi");
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["options", i], message: "Hai phương án trùng nhau." });
      seen.add(key);
    });
  });

export type QuestionInput = z.input<typeof QuestionInput>;
export type QuestionData = z.output<typeof QuestionInput>;

/** Lỗi đầu tiên của một câu, viết thành một dòng cho người soạn. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Câu hỏi chưa hợp lệ.";
  const [field, index] = issue.path;
  if (field === "options" && typeof index === "number") return `Phương án ${LETTERS[index] ?? index + 1}: ${issue.message}`;
  return issue.message;
}

// ---------------------------------------------------------------------------------------------------------------------
// Nhập nhiều câu bằng cách dán văn bản (chép từ Word, đề cương). Mỗi câu:
//
//   Câu 1: Nội dung câu hỏi?
//   A. Phương án thứ nhất
//   *B. Phương án đúng (đánh dấu sao ở đầu), hoặc ghi dòng "Đáp án: B" sau các phương án
//   C. Phương án thứ ba
//   Giải thích: Vì sao phương án đúng.     (không bắt buộc)
//   Trang: 59                               (không bắt buộc)
//
// Câu mới bắt đầu ở dòng "Câu <số>", hoặc ở dòng thường đầu tiên sau phương án của câu trước.
// ---------------------------------------------------------------------------------------------------------------------

export interface ParsedQuestion {
  /** Số thứ tự câu trong văn bản (bắt đầu từ 1), để báo lỗi. */
  index: number;
  /** Dòng đầu của câu trong văn bản (bắt đầu từ 1). */
  line: number;
  data: QuestionData | null;
  error: string | null;
}

const QUESTION_START = /^(?:câu|cau|question)\s*\d+\s*[:.)\-–]\s*/iu;
const OPTION = /^(\*?)\s*([A-Fa-f])\s*[.)]\s*(\*?)\s*(.*)$/u;
const ANSWER = /^(?:đáp án|dap an|đáp án đúng|answer)\s*[:\-–]?\s*([A-Fa-f])\b/iu;
const EXPLAIN = /^(?:giải thích|giai thich|gt|explain)\s*[:\-–]\s*(.*)$/iu;
const PAGE = /^(?:trang|tr\.?|page)\s*[:\-–]?\s*(\d+)\s*$/iu;

interface Draft {
  line: number;
  q: string[];
  options: { letter: string; text: string; marked: boolean }[];
  answerLetter: string | null;
  explain: string[];
  page: number | null;
  /** Dòng thường tiếp theo nối vào giải thích (ngay sau dòng "Giải thích:", chưa gặp dòng trống). */
  inExplain: boolean;
}

const newDraft = (line: number, q: string): Draft => ({
  line, q: q ? [q] : [], options: [], answerLetter: null, explain: [], page: null, inExplain: false,
});

function finish(d: Draft, index: number): ParsedQuestion {
  const marked = d.options.flatMap((o, i) => (o.marked ? [i] : []));
  const letters = d.options.map((o) => o.letter);
  let error: string | null = null;
  let answer = -1;
  if (d.answerLetter) {
    answer = letters.indexOf(d.answerLetter);
    if (answer < 0) error = `Đáp án ${d.answerLetter} không có trong các phương án.`;
  } else if (marked.length === 1) answer = marked[0];
  else if (marked.length > 1) error = "Có nhiều phương án cùng đánh dấu đúng.";
  else error = "Chưa đánh dấu đáp án đúng (thêm * trước chữ cái, hoặc dòng \"Đáp án: B\").";

  if (!error && letters.some((l, i) => l !== LETTERS[i])) error = "Các phương án phải ghi lần lượt A, B, C…";

  const input = {
    q: d.q.join(" "),
    options: d.options.map((o) => o.text),
    answer,
    explain: d.explain.join(" "),
    page: d.page,
  };
  if (error) return { index, line: d.line, data: null, error };
  const parsed = QuestionInput.safeParse(input);
  return parsed.success
    ? { index, line: d.line, data: parsed.data, error: null }
    : { index, line: d.line, data: null, error: firstIssue(parsed.error) };
}

/** Đọc văn bản dán vào thành danh sách câu, mỗi câu kèm lỗi nếu có. */
export function parseQuestionText(text: string): ParsedQuestion[] {
  const out: ParsedQuestion[] = [];
  let draft: Draft | null = null;
  const flush = () => {
    if (draft && (draft.q.length || draft.options.length)) out.push(finish(draft, out.length + 1));
    draft = null;
  };

  text.replace(/\r\n?/g, "\n").split("\n").forEach((raw, i) => {
    const line = raw.replace(/ /g, " ").trim();
    const n = i + 1;
    if (!line) {
      if (draft) draft.inExplain = false;
      return;
    }

    const start = QUESTION_START.exec(line);
    if (start) {
      flush();
      draft = newDraft(n, line.slice(start[0].length).trim());
      return;
    }

    const answer = ANSWER.exec(line);
    if (answer && draft) {
      draft.answerLetter = answer[1].toUpperCase();
      return;
    }
    const explain = EXPLAIN.exec(line);
    if (explain && draft) {
      draft.explain.push(explain[1].trim());
      draft.inExplain = true;
      return;
    }
    const page = PAGE.exec(line);
    if (page && draft) {
      draft.page = Number(page[1]);
      return;
    }

    const option = OPTION.exec(line);
    if (option && draft && (draft.q.length || draft.options.length)) {
      const letter = option[2].toUpperCase();
      draft.options.push({ letter, text: option[4].trim(), marked: Boolean(option[1] || option[3]) });
      draft.inExplain = false;
      return;
    }

    // Dòng thường. Văn bản dán từ Word để mỗi phương án trên một dòng, nên dòng thường sau các phương án là câu mới,
    // trừ khi đang nối tiếp phần giải thích. Trước phương án đầu tiên thì là phần tiếp của câu hỏi.
    const current: Draft | null = draft;
    if (!current || (current.options.length && !current.inExplain)) {
      flush();
      draft = newDraft(n, line);
    } else if (current.inExplain) current.explain.push(line);
    else current.q.push(line);
  });
  flush();
  return out;
}
